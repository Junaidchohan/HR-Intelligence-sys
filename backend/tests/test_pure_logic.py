"""
These tests exercise only the dependency-free modules (normalization,
entity_resolution, rubric, citation) using Python's stdlib `unittest`.
They run with ZERO third-party packages installed, which is why they're
what we can actually execute inside this sandbox (see FINAL_STATUS.md).

Run with:  python3 -m unittest discover -s backend/tests -p "test_pure_logic.py" -v
"""
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.normalization.normalize import (
    normalize_github_user,
    normalize_arxiv_user,
    normalize_huggingface_user,
    extract_skills,
)
from app.connectors.arxiv import ArXivConnector
from app.connectors.huggingface import HuggingFaceConnector
from app.entity_resolution.resolve import CandidateRecord, resolve_identity
from app.rubric.rubric import Rubric, RubricCriterion, score_candidate
from app.citation.validate import Citation, validate_citation, is_well_formed_url, claim_supported_by_text

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "github"


class TestNormalization(unittest.TestCase):
    def test_normalize_github_user_extracts_email_from_bio(self):
        payload = json.loads((FIXTURES / "users" / "octocat.json").read_text())
        identity = normalize_github_user(payload)
        self.assertEqual(identity.username, "octocat")
        self.assertEqual(identity.primary_email, "octocat@example.com")
        self.assertIn("python", identity.skills)
        self.assertIn("kubernetes", identity.skills)

    def test_normalize_with_repo_languages_enriches_skills(self):
        payload = json.loads((FIXTURES / "users" / "janedoe.json").read_text())
        identity = normalize_github_user(payload, repo_languages=["TypeScript"])
        self.assertIn("react", identity.skills)
        self.assertIn("typescript", identity.skills)

    def test_missing_login_raises(self):
        with self.assertRaises(ValueError):
            normalize_github_user({"name": "No Login"})

    def test_extract_skills_case_insensitive(self):
        skills = extract_skills("I love PYTHON and Kubernetes")
        self.assertIn("python", skills)
        self.assertIn("kubernetes", skills)

    def test_normalize_arxiv_user(self):
        arxiv_fixture = Path(__file__).resolve().parents[1] / "fixtures" / "arxiv" / "papers" / "janedoe.json"
        payload = json.loads(arxiv_fixture.read_text())
        identity = normalize_arxiv_user(payload, extra_skills=["pytorch"])
        self.assertEqual(identity.source, "arxiv")
        self.assertEqual(identity.full_name, "Jane Doe")
        self.assertEqual(identity.primary_email, "jane.doe@example.com")
        self.assertIn("pytorch", identity.skills)

    def test_normalize_huggingface_user(self):
        hf_fixture = Path(__file__).resolve().parents[1] / "fixtures" / "huggingface" / "users" / "janedoe.json"
        payload = json.loads(hf_fixture.read_text())
        identity = normalize_huggingface_user(payload)
        self.assertEqual(identity.source, "huggingface")
        self.assertEqual(identity.username, "janedoe")
        self.assertEqual(identity.primary_email, "jane.doe@example.com")
        self.assertIn("pytorch", identity.skills)


class TestEntityResolution(unittest.TestCase):
    def _identity(self, **overrides):
        payload = json.loads((FIXTURES / "users" / "octocat.json").read_text())
        identity = normalize_github_user(payload)
        for k, v in overrides.items():
            setattr(identity, k, v)
        return identity

    def test_exact_email_match_merges(self):
        identity = self._identity()
        existing = CandidateRecord(id=1, full_name="Someone Else", primary_email="octocat@example.com", identities=[])
        result = resolve_identity(identity, [existing])
        self.assertFalse(result.is_new)
        self.assertEqual(result.reason, "exact_email_match")
        self.assertEqual(result.match.id, 1)

    def test_exact_username_match_is_idempotent(self):
        identity = self._identity(primary_email=None)
        existing = CandidateRecord(id=2, full_name="X", primary_email=None, identities=[("github", "octocat")])
        result = resolve_identity(identity, [existing])
        self.assertEqual(result.reason, "exact_source_username_match")

    def test_no_match_creates_new_candidate(self):
        identity = self._identity(primary_email=None, username="totally-unknown-user")
        existing = CandidateRecord(id=3, full_name="Completely Different Person", primary_email=None, identities=[])
        result = resolve_identity(identity, [existing])
        self.assertTrue(result.is_new)
        self.assertIsNone(result.match)

    def test_fuzzy_name_match(self):
        identity = self._identity(primary_email=None, username="new-handle", full_name="The Octocatt")
        existing = CandidateRecord(id=4, full_name="The Octocat", primary_email=None, identities=[])
        result = resolve_identity(identity, [existing])
        self.assertEqual(result.reason, "fuzzy_name_match")
        self.assertFalse(result.is_new)

    def test_cross_source_identity_resolution_merges_github_arxiv_and_huggingface(self):
        gh_payload = json.loads((Path(__file__).resolve().parents[1] / "fixtures" / "github" / "users" / "janedoe.json").read_text())
        gh_identity = normalize_github_user(gh_payload)

        # Existing candidate record created from GitHub profile
        existing_candidate = CandidateRecord(
            id=10,
            full_name=gh_identity.full_name,
            primary_email=gh_identity.primary_email,
            identities=[("github", gh_identity.username)],
        )

        # Ingest arXiv identity with matching email/name
        arxiv_fixture = Path(__file__).resolve().parents[1] / "fixtures" / "arxiv" / "papers" / "janedoe.json"
        arxiv_payload = json.loads(arxiv_fixture.read_text())
        arxiv_identity = normalize_arxiv_user(arxiv_payload)

        arxiv_result = resolve_identity(arxiv_identity, [existing_candidate])
        self.assertFalse(arxiv_result.is_new)
        self.assertEqual(arxiv_result.reason, "exact_email_match")
        self.assertEqual(arxiv_result.match.id, 10)

        # Ingest HuggingFace identity with matching email/name
        hf_fixture = Path(__file__).resolve().parents[1] / "fixtures" / "huggingface" / "users" / "janedoe.json"
        hf_payload = json.loads(hf_fixture.read_text())
        hf_identity = normalize_huggingface_user(hf_payload)

        hf_result = resolve_identity(hf_identity, [existing_candidate])
        self.assertFalse(hf_result.is_new)
        self.assertEqual(hf_result.reason, "exact_email_match")
        self.assertEqual(hf_result.match.id, 10)



class TestRubricScoring(unittest.TestCase):
    def setUp(self):
        self.rubric = Rubric(
            name="Backend Engineer",
            criteria=[
                RubricCriterion(name="Core Language", weight=0.5, required_skills=["python", "go"], min_evidence_count=2),
                RubricCriterion(name="Infra", weight=0.5, required_skills=["docker", "kubernetes"], min_evidence_count=1),
            ],
        )

    def test_full_match_scores_high(self):
        result = score_candidate(self.rubric, ["python", "go", "docker", "kubernetes"], evidence_count=5)
        self.assertGreaterEqual(result.overall_score, 90)
        self.assertEqual(result.recommendation, "strong_match")

    def test_no_match_scores_low(self):
        result = score_candidate(self.rubric, ["photoshop"], evidence_count=0)
        self.assertEqual(result.overall_score, 0.0)
        self.assertEqual(result.recommendation, "not_a_match")

    def test_partial_match(self):
        result = score_candidate(self.rubric, ["python"], evidence_count=1)
        self.assertGreater(result.overall_score, 0)
        self.assertLess(result.overall_score, 100)

    def test_invalid_weights_raise(self):
        bad_rubric = Rubric(name="Bad", criteria=[RubricCriterion(name="A", weight=0.3), RubricCriterion(name="B", weight=0.3)])
        with self.assertRaises(ValueError):
            score_candidate(bad_rubric, ["python"], evidence_count=0)


class TestCitationValidation(unittest.TestCase):
    def test_well_formed_url(self):
        self.assertTrue(is_well_formed_url("https://github.com/octocat"))
        self.assertFalse(is_well_formed_url("not-a-url"))
        self.assertFalse(is_well_formed_url("ftp://example.com/file"))

    def test_claim_supported_when_keyword_present(self):
        self.assertTrue(claim_supported_by_text("kubernetes", "Terraform + Docker + Kubernetes infra"))
        self.assertFalse(claim_supported_by_text("rust", "Terraform + Docker + Kubernetes infra"))

    def test_validate_citation_flags_unsupported_claim(self):
        citation = Citation(evidence_id=1, url="https://github.com/x/y", title="repo", snippet="A Java project", claimed_skill="python")
        result = validate_citation(citation)
        self.assertFalse(result.claim_supported)
        self.assertFalse(result.valid)

    def test_validate_citation_passes_when_supported(self):
        citation = Citation(evidence_id=1, url="https://github.com/x/y", title="repo", snippet="A Python project", claimed_skill="python")
        result = validate_citation(citation)
        self.assertTrue(result.claim_supported)
        self.assertTrue(result.valid)

    def test_validate_citation_flags_bad_url(self):
        citation = Citation(evidence_id=1, url="not-a-url", title=None, snippet=None)
        result = validate_citation(citation)
        self.assertFalse(result.url_well_formed)
        self.assertFalse(result.valid)


if __name__ == "__main__":
    unittest.main()
