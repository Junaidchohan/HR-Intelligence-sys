from __future__ import annotations

from sqlalchemy.orm import Session

from app.connectors.arxiv import ArXivConnector
from app.connectors.conference import ConferenceConnector
from app.connectors.github import GitHubConnector
from app.connectors.huggingface import HuggingFaceConnector
from app.core.audit import log_action
from app.entity_resolution.resolve import CandidateRecord, resolve_identity
from app.models import Candidate, CandidateIdentity, Evidence
from app.normalization.normalize import (
    NormalizedIdentity,
    normalize_arxiv_user,
    normalize_conference_author,
    normalize_github_user,
    normalize_huggingface_user,
)


def _load_candidate_pool(db: Session) -> list[CandidateRecord]:
    pool = []
    for c in db.query(Candidate).all():
        idents = [(i.source, i.username) for i in c.identities if i.username]
        pool.append(CandidateRecord(id=c.id, full_name=c.full_name, primary_email=c.primary_email, identities=idents))
    return pool


def _merge_skills(existing: list[str], new: list[str]) -> list[str]:
    return sorted(set(existing) | set(new))


def ingest_github_candidate(db: Session, username: str, user_id: int | None = None) -> dict:
    connector = GitHubConnector(db=db, user_id=user_id)
    raw_user = connector.fetch_candidate(username)
    languages = connector.fetch_repo_languages(username)
    identity: NormalizedIdentity = normalize_github_user(raw_user, repo_languages=languages)

    pool = _load_candidate_pool(db)
    result = resolve_identity(identity, pool)

    if result.is_new or result.match is None:
        candidate = Candidate(
            full_name=identity.full_name,
            primary_email=identity.primary_email,
            location=identity.location,
            bio=identity.bio,
            skills=identity.skills,
        )
        db.add(candidate)
        db.flush()
    else:
        candidate = db.query(Candidate).get(result.match.id)
        candidate.skills = _merge_skills(candidate.skills or [], identity.skills)
        candidate.full_name = candidate.full_name or identity.full_name
        candidate.primary_email = candidate.primary_email or identity.primary_email
        candidate.location = candidate.location or identity.location
        candidate.bio = candidate.bio or identity.bio

    existing_ci = (
        db.query(CandidateIdentity)
        .filter(CandidateIdentity.source == identity.source, CandidateIdentity.source_id == identity.source_id)
        .first()
    )
    if existing_ci:
        existing_ci.raw_payload = identity.raw
        existing_ci.username = identity.username
        existing_ci.candidate_id = candidate.id
        existing_ci.resolution_reason = result.reason
        existing_ci.resolution_confidence = result.confidence
    else:
        db.add(
            CandidateIdentity(
                source=identity.source,
                source_id=identity.source_id,
                username=identity.username,
                raw_payload=identity.raw,
                candidate_id=candidate.id,
                resolution_reason=result.reason,
                resolution_confidence=result.confidence,
            )
        )

    # Evidence: bio + each repo
    evidence_count = 0
    if identity.bio:
        db.add(
            Evidence(
                candidate_id=candidate.id,
                source="github",
                evidence_type="bio",
                title=f"{identity.username} GitHub bio",
                url=identity.profile_url or f"https://github.com/{identity.username}",
                snippet=identity.bio,
            )
        )
        evidence_count += 1

    for repo in connector.fetch_repo_summaries(username):
        snippet = repo.get("description") or ""
        if repo.get("language"):
            snippet = f"[{repo['language']}] {snippet}".strip()
        db.add(
            Evidence(
                candidate_id=candidate.id,
                source="github",
                evidence_type="repo",
                title=repo.get("name"),
                url=repo.get("url") or (identity.profile_url or ""),
                snippet=snippet,
            )
        )
        evidence_count += 1

    db.commit()
    db.refresh(candidate)

    log_action(
        db,
        action="ingest_github_candidate",
        entity_type="candidate",
        entity_id=candidate.id,
        user_id=user_id,
        details={"username": username, "resolution_reason": result.reason, "confidence": result.confidence},
    )

    return {
        "candidate_id": candidate.id,
        "is_new": result.is_new,
        "resolution_reason": result.reason,
        "resolution_confidence": result.confidence,
        "evidence_count": evidence_count,
    }


def ingest_arxiv_candidate(db: Session, author: str, user_id: int | None = None) -> dict:
    connector = ArXivConnector()
    raw_payload = connector.fetch_candidate(author)
    languages = connector.fetch_repo_languages(author)
    identity: NormalizedIdentity = normalize_arxiv_user(raw_payload, extra_skills=languages)

    pool = _load_candidate_pool(db)
    result = resolve_identity(identity, pool)

    if result.is_new or result.match is None:
        candidate = Candidate(
            full_name=identity.full_name,
            primary_email=identity.primary_email,
            location=identity.location,
            bio=identity.bio,
            skills=identity.skills,
        )
        db.add(candidate)
        db.flush()
    else:
        candidate = db.query(Candidate).get(result.match.id)
        candidate.skills = _merge_skills(candidate.skills or [], identity.skills)
        candidate.full_name = candidate.full_name or identity.full_name
        candidate.primary_email = candidate.primary_email or identity.primary_email
        candidate.location = candidate.location or identity.location
        candidate.bio = candidate.bio or identity.bio

    existing_ci = (
        db.query(CandidateIdentity)
        .filter(CandidateIdentity.source == identity.source, CandidateIdentity.source_id == identity.source_id)
        .first()
    )
    if existing_ci:
        existing_ci.raw_payload = identity.raw
        existing_ci.username = identity.username
        existing_ci.candidate_id = candidate.id
        existing_ci.resolution_reason = result.reason
        existing_ci.resolution_confidence = result.confidence
    else:
        db.add(
            CandidateIdentity(
                source=identity.source,
                source_id=identity.source_id,
                username=identity.username,
                raw_payload=identity.raw,
                candidate_id=candidate.id,
                resolution_reason=result.reason,
                resolution_confidence=result.confidence,
            )
        )

    evidence_count = 0
    for paper in connector.fetch_paper_summaries(author):
        db.add(
            Evidence(
                candidate_id=candidate.id,
                source="arxiv",
                evidence_type="article",
                title=paper.get("name"),
                url=paper.get("url"),
                snippet=paper.get("description"),
            )
        )
        evidence_count += 1

    db.commit()
    db.refresh(candidate)

    log_action(
        db,
        action="ingest_arxiv_candidate",
        entity_type="candidate",
        entity_id=candidate.id,
        user_id=user_id,
        details={"author": author, "resolution_reason": result.reason, "confidence": result.confidence},
    )

    return {
        "candidate_id": candidate.id,
        "is_new": result.is_new,
        "resolution_reason": result.reason,
        "resolution_confidence": result.confidence,
        "evidence_count": evidence_count,
    }


def ingest_huggingface_candidate(db: Session, username: str, user_id: int | None = None) -> dict:
    connector = HuggingFaceConnector()
    raw_payload = connector.fetch_candidate(username)
    languages = connector.fetch_repo_languages(username)
    identity: NormalizedIdentity = normalize_huggingface_user(raw_payload, extra_skills=languages)

    pool = _load_candidate_pool(db)
    result = resolve_identity(identity, pool)

    if result.is_new or result.match is None:
        candidate = Candidate(
            full_name=identity.full_name,
            primary_email=identity.primary_email,
            location=identity.location,
            bio=identity.bio,
            skills=identity.skills,
        )
        db.add(candidate)
        db.flush()
    else:
        candidate = db.query(Candidate).get(result.match.id)
        candidate.skills = _merge_skills(candidate.skills or [], identity.skills)
        candidate.full_name = candidate.full_name or identity.full_name
        candidate.primary_email = candidate.primary_email or identity.primary_email
        candidate.location = candidate.location or identity.location
        candidate.bio = candidate.bio or identity.bio

    existing_ci = (
        db.query(CandidateIdentity)
        .filter(CandidateIdentity.source == identity.source, CandidateIdentity.source_id == identity.source_id)
        .first()
    )
    if existing_ci:
        existing_ci.raw_payload = identity.raw
        existing_ci.username = identity.username
        existing_ci.candidate_id = candidate.id
        existing_ci.resolution_reason = result.reason
        existing_ci.resolution_confidence = result.confidence
    else:
        db.add(
            CandidateIdentity(
                source=identity.source,
                source_id=identity.source_id,
                username=identity.username,
                raw_payload=identity.raw,
                candidate_id=candidate.id,
                resolution_reason=result.reason,
                resolution_confidence=result.confidence,
            )
        )

    evidence_count = 0
    for model in connector.fetch_model_summaries(username):
        db.add(
            Evidence(
                candidate_id=candidate.id,
                source="huggingface",
                evidence_type="repo",
                title=model.get("name"),
                url=model.get("url"),
                snippet=model.get("description"),
            )
        )
        evidence_count += 1

    db.commit()
    db.refresh(candidate)

    log_action(
        db,
        action="ingest_huggingface_candidate",
        entity_type="candidate",
        entity_id=candidate.id,
        user_id=user_id,
        details={"username": username, "resolution_reason": result.reason, "confidence": result.confidence},
    )

    return {
        "candidate_id": candidate.id,
        "is_new": result.is_new,
        "resolution_reason": result.reason,
        "resolution_confidence": result.confidence,
        "evidence_count": evidence_count,
    }


def ingest_conference_candidate(db: Session, author: str, user_id: int | None = None) -> dict:
    """Ingest a candidate's conference publication record.

    Uses the fixture-backed ConferenceConnector (NeurIPS 2023, ICML 2023,
    ICLR 2024, CVPR 2023, ACL 2023). Falls back to a synthetic record so the
    pipeline never 404s during a demo or audit run.
    """
    connector = ConferenceConnector()
    raw_payload = connector.fetch_candidate(author)
    languages = connector.fetch_repo_languages(author)
    identity: NormalizedIdentity = normalize_conference_author(raw_payload, extra_skills=languages)

    pool = _load_candidate_pool(db)
    result = resolve_identity(identity, pool)

    if result.is_new or result.match is None:
        candidate = Candidate(
            full_name=identity.full_name,
            primary_email=identity.primary_email,
            location=identity.location,
            bio=identity.bio,
            skills=identity.skills,
        )
        db.add(candidate)
        db.flush()
    else:
        candidate = db.query(Candidate).get(result.match.id)
        candidate.skills = _merge_skills(candidate.skills or [], identity.skills)
        candidate.full_name = candidate.full_name or identity.full_name
        candidate.primary_email = candidate.primary_email or identity.primary_email
        candidate.location = candidate.location or identity.location
        candidate.bio = candidate.bio or identity.bio

    existing_ci = (
        db.query(CandidateIdentity)
        .filter(CandidateIdentity.source == identity.source, CandidateIdentity.source_id == identity.source_id)
        .first()
    )
    if existing_ci:
        existing_ci.raw_payload = identity.raw
        existing_ci.username = identity.username
        existing_ci.candidate_id = candidate.id
        existing_ci.resolution_reason = result.reason
        existing_ci.resolution_confidence = result.confidence
    else:
        db.add(
            CandidateIdentity(
                source=identity.source,
                source_id=identity.source_id,
                username=identity.username,
                raw_payload=identity.raw,
                candidate_id=candidate.id,
                resolution_reason=result.reason,
                resolution_confidence=result.confidence,
            )
        )

    evidence_count = 0
    for paper in connector.fetch_paper_summaries(author):
        db.add(
            Evidence(
                candidate_id=candidate.id,
                source="conference",
                evidence_type="article",
                title=paper.get("name"),
                url=paper.get("url"),
                snippet=paper.get("description"),
            )
        )
        evidence_count += 1

    db.commit()
    db.refresh(candidate)

    log_action(
        db,
        action="ingest_conference_candidate",
        entity_type="candidate",
        entity_id=candidate.id,
        user_id=user_id,
        details={"author": author, "resolution_reason": result.reason, "confidence": result.confidence},
    )

    return {
        "candidate_id": candidate.id,
        "is_new": result.is_new,
        "resolution_reason": result.reason,
        "resolution_confidence": result.confidence,
        "evidence_count": evidence_count,
    }
