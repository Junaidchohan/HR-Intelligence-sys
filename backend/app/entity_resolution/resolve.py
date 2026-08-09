"""
Entity resolution: decide whether a newly-normalized identity refers to an
existing canonical candidate, or represents a brand new one.

Uses deterministic, explainable signals (exact email match, exact
username+source match, fuzzy name similarity) rather than a black box, so
recruiters can trust and audit merge decisions. Falls back to Python's
stdlib difflib for string similarity so this module has zero third-party
dependencies and can be unit tested in isolation.
"""
from __future__ import annotations

from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Optional

from app.normalization.normalize import NormalizedIdentity


@dataclass
class CandidateRecord:
    """Minimal view of an existing canonical candidate + its known identities,
    decoupled from the ORM so this module stays framework-free."""
    id: int
    full_name: Optional[str]
    primary_email: Optional[str]
    identities: list[tuple[str, str]]  # (source, username)


@dataclass
class ResolutionResult:
    match: Optional[CandidateRecord]
    confidence: float
    reason: str
    is_new: bool


NAME_MATCH_THRESHOLD = 0.90
AUTO_MERGE_EMAIL_MATCH = 1.0
AUTO_MERGE_USERNAME_MATCH = 0.98


def _name_similarity(a: Optional[str], b: Optional[str]) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.strip().lower(), b.strip().lower()).ratio()


def resolve_identity(identity: NormalizedIdentity, candidates: list[CandidateRecord]) -> ResolutionResult:
    """Attempt to resolve `identity` against a pool of existing candidates.

    Resolution order (most to least confident):
      1. Exact email match -> auto-merge
      2. Exact (source, username) match -> auto-merge (re-ingest of same identity)
      3. High-confidence fuzzy name match -> merge, flagged for review
      4. No match -> new candidate
    """
    # 1. Exact email match
    if identity.primary_email:
        for c in candidates:
            if c.primary_email and c.primary_email.lower() == identity.primary_email.lower():
                return ResolutionResult(match=c, confidence=AUTO_MERGE_EMAIL_MATCH,
                                         reason="exact_email_match", is_new=False)

    # 2. Exact source+username match (idempotent re-ingestion)
    if identity.username:
        for c in candidates:
            for src, uname in c.identities:
                if src == identity.source and uname.lower() == identity.username.lower():
                    return ResolutionResult(match=c, confidence=AUTO_MERGE_USERNAME_MATCH,
                                             reason="exact_source_username_match", is_new=False)

    # 3. Fuzzy name match
    best: Optional[CandidateRecord] = None
    best_score = 0.0
    for c in candidates:
        score = _name_similarity(identity.full_name, c.full_name)
        if score > best_score:
            best_score = score
            best = c

    if best is not None and best_score >= NAME_MATCH_THRESHOLD:
        return ResolutionResult(match=best, confidence=round(best_score, 4),
                                 reason="fuzzy_name_match", is_new=False)

    # 4. No match
    return ResolutionResult(match=None, confidence=round(best_score, 4) if best else 0.0,
                             reason="no_match", is_new=True)
