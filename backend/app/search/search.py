from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Candidate


def search_candidates(db: Session, query: str, limit: int = 25) -> list[tuple[Candidate, str]]:
    """Simple, explainable search: matches on name/bio/location substring or
    an exact skill token. Returns (candidate, match_reason) pairs.

    This intentionally avoids a vector/embedding search stack (extra infra,
    non-deterministic) in favor of something transparent recruiters can
    reason about; it can be swapped for a vector index later without
    changing the API contract.
    """
    q = query.strip().lower()
    if not q:
        return []

    candidates = db.query(Candidate).all()
    results: list[tuple[Candidate, str]] = []
    for c in candidates:
        skills = [s.lower() for s in (c.skills or [])]
        if q in skills:
            results.append((c, f"skill match: '{query}'"))
            continue
        haystack_parts = [c.full_name or "", c.bio or "", c.location or ""]
        haystack = " ".join(haystack_parts).lower()
        if q in haystack:
            results.append((c, f"text match in profile"))
            continue
        # partial skill match (e.g. "react" matches "react native")
        if any(q in s or s in q for s in skills):
            results.append((c, f"partial skill match: '{query}'"))

    return results[:limit]
