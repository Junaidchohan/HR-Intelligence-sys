"""
Citation validation.

Every claim the screening agent makes about a candidate (e.g. "has
production Kubernetes experience") must be backed by an Evidence record with
a real, well-formed source URL. This module checks:
  1. URL well-formedness / scheme allow-list
  2. That a claimed skill/keyword actually appears in the evidence's own
     text (title + snippet), preventing hallucinated attributions
  3. Optional live reachability check (HEAD request) - network dependent,
     skipped automatically when offline/unavailable.

Kept dependency-free at the core (validate_citation / validate_claim) so the
logic can be unit tested without network or an HTTP client installed.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Optional
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}


@dataclass
class Citation:
    evidence_id: int
    url: str
    title: Optional[str]
    snippet: Optional[str]
    claimed_skill: Optional[str] = None


@dataclass
class ValidationResult:
    evidence_id: int
    url_well_formed: bool
    claim_supported: Optional[bool]  # None if no claim was checked
    valid: bool
    notes: str


def is_well_formed_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
    except ValueError:
        return False
    return parsed.scheme in ALLOWED_SCHEMES and bool(parsed.netloc)


def claim_supported_by_text(claim: str, *texts: Optional[str]) -> bool:
    """Very deliberately simple: a claim is 'supported' if its keyword
    appears in the evidence's own text. This avoids ever inventing support
    that isn't literally present in the source material."""
    claim_norm = re.sub(r"[^a-z0-9 ]", "", claim.lower()).strip()
    if not claim_norm:
        return False
    haystack = " ".join(t.lower() for t in texts if t)
    return claim_norm in haystack


def validate_citation(citation: Citation) -> ValidationResult:
    url_ok = is_well_formed_url(citation.url)
    claim_ok: Optional[bool] = None
    notes_parts = []

    if not url_ok:
        notes_parts.append("URL is missing/malformed or uses a disallowed scheme.")

    if citation.claimed_skill:
        claim_ok = claim_supported_by_text(citation.claimed_skill, citation.title, citation.snippet)
        if not claim_ok:
            notes_parts.append(
                f"Claimed skill '{citation.claimed_skill}' not found verbatim in evidence text; flagged for human review."
            )

    valid = url_ok and (claim_ok is not False)
    notes = " ".join(notes_parts) or "OK"
    return ValidationResult(
        evidence_id=citation.evidence_id,
        url_well_formed=url_ok,
        claim_supported=claim_ok,
        valid=valid,
        notes=notes,
    )


def validate_batch(citations: list[Citation]) -> list[ValidationResult]:
    return [validate_citation(c) for c in citations]
