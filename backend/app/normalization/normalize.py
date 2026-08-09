"""
Normalization layer.

Converts raw, source-specific payloads (e.g. a GitHub user object) into a
standard NormalizedIdentity shape that the rest of the pipeline understands.

Deliberately dependency-free (stdlib only) so it can be unit tested without
installing the full backend dependency stack.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Optional


EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

# Very small controlled vocabulary used to pull "skills" out of free text
# (bios, repo descriptions, languages). Kept intentionally small & explicit
# rather than pretending to run an NLP model we can't ship offline.
SKILL_KEYWORDS = [
    "python", "javascript", "typescript", "java", "go", "golang", "rust",
    "c++", "c#", "ruby", "php", "swift", "kotlin", "scala", "sql",
    "react", "vue", "angular", "next.js", "nextjs", "django", "flask",
    "fastapi", "spring", "node", "node.js", "graphql", "rest api",
    "kubernetes", "docker", "terraform", "aws", "gcp", "azure",
    "machine learning", "deep learning", "nlp", "computer vision",
    "pytorch", "tensorflow", "pandas", "numpy", "spark", "airflow",
    "postgresql", "postgres", "mysql", "mongodb", "redis", "kafka",
]


@dataclass
class NormalizedIdentity:
    source: str
    source_id: str
    full_name: Optional[str] = None
    primary_email: Optional[str] = None
    username: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    skills: list[str] = field(default_factory=list)
    profile_url: Optional[str] = None
    raw: dict[str, Any] = field(default_factory=dict)


def _clean_str(value: Any) -> Optional[str]:
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def extract_skills(*texts: Optional[str], extra: Optional[list[str]] = None) -> list[str]:
    """Extract a de-duplicated, sorted list of known skills from free text
    plus an explicit list (e.g. GitHub repo languages)."""
    found: set[str] = set()
    haystacks = [t.lower() for t in texts if t]
    for kw in SKILL_KEYWORDS:
        for h in haystacks:
            if kw in h:
                found.add(kw)
                break
    for item in extra or []:
        if not item:
            continue
        norm = item.strip().lower()
        if norm:
            found.add(norm)
    return sorted(found)


def normalize_github_user(payload: dict[str, Any], repo_languages: Optional[list[str]] = None) -> NormalizedIdentity:
    """Normalize a GitHub `/users/{username}` API payload (or fixture with the
    same shape) into a NormalizedIdentity."""
    login = _clean_str(payload.get("login"))
    if not login:
        raise ValueError("GitHub payload missing required 'login' field")

    bio = _clean_str(payload.get("bio"))
    email = _clean_str(payload.get("email"))
    if not email and bio:
        m = EMAIL_RE.search(bio)
        if m:
            email = m.group(0)

    skills = extract_skills(bio, payload.get("blog"), extra=repo_languages)

    return NormalizedIdentity(
        source="github",
        source_id=str(payload.get("id") or login),
        full_name=_clean_str(payload.get("name")) or login,
        primary_email=email,
        username=login,
        location=_clean_str(payload.get("location")),
        bio=bio,
        skills=skills,
        profile_url=_clean_str(payload.get("html_url")) or f"https://github.com/{login}",
        raw=payload,
    )


def normalize_manual_entry(payload: dict[str, Any]) -> NormalizedIdentity:
    """Normalize a manually-entered candidate (e.g. from a resume upload
    handled elsewhere, or recruiter data entry)."""
    source_id = _clean_str(payload.get("source_id")) or _clean_str(payload.get("email")) or _clean_str(payload.get("full_name"))
    if not source_id:
        raise ValueError("Manual entry requires at least one of source_id/email/full_name")
    skills_field = payload.get("skills")
    extra_skills = skills_field if isinstance(skills_field, list) else None
    return NormalizedIdentity(
        source="manual",
        source_id=source_id,
        full_name=_clean_str(payload.get("full_name")),
        primary_email=_clean_str(payload.get("email")),
        username=_clean_str(payload.get("username")),
        location=_clean_str(payload.get("location")),
        bio=_clean_str(payload.get("bio")),
        skills=extract_skills(payload.get("bio"), extra=extra_skills),
        profile_url=_clean_str(payload.get("profile_url")),
        raw=payload,
    )


def normalize_arxiv_user(payload: dict[str, Any], extra_skills: Optional[list[str]] = None) -> NormalizedIdentity:
    """Normalize an arXiv candidate payload (or fixture) into a NormalizedIdentity."""
    author = _clean_str(payload.get("author")) or _clean_str(payload.get("query"))
    if not author:
        raise ValueError("arXiv payload missing required 'author' or 'query' field")

    email = _clean_str(payload.get("email"))
    papers = payload.get("papers", [])
    paper_summaries = " ".join([p.get("summary", "") + " " + p.get("title", "") for p in papers if isinstance(p, dict)])

    if not email and paper_summaries:
        m = EMAIL_RE.search(paper_summaries)
        if m:
            email = m.group(0)

    skills = extract_skills(paper_summaries, extra=extra_skills)
    first_paper_url = papers[0].get("pdf_url") if papers and isinstance(papers[0], dict) else None

    return NormalizedIdentity(
        source="arxiv",
        source_id=author,
        full_name=author,
        primary_email=email,
        username=author,
        bio=f"arXiv Researcher with {len(papers)} papers.",
        skills=skills,
        profile_url=first_paper_url or f"https://arxiv.org/search/?searchtype=author&query={author}",
        raw=payload,
    )


def normalize_huggingface_user(payload: dict[str, Any], extra_skills: Optional[list[str]] = None) -> NormalizedIdentity:
    """Normalize a HuggingFace author payload (or fixture) into a NormalizedIdentity."""
    username = _clean_str(payload.get("username")) or _clean_str(payload.get("author"))
    if not username:
        raise ValueError("HuggingFace payload missing required 'username' or 'author' field")

    bio = _clean_str(payload.get("bio"))
    email = _clean_str(payload.get("email"))
    if not email and bio:
        m = EMAIL_RE.search(bio)
        if m:
            email = m.group(0)

    models = payload.get("models", [])
    model_tags = []
    for m in models:
        if isinstance(m, dict):
            if m.get("pipeline_tag"):
                model_tags.append(m["pipeline_tag"])
            if isinstance(m.get("tags"), list):
                model_tags.extend(m["tags"])

    all_extra = (extra_skills or []) + model_tags
    skills = extract_skills(bio, extra=all_extra)

    return NormalizedIdentity(
        source="huggingface",
        source_id=username,
        full_name=_clean_str(payload.get("full_name")) or username,
        primary_email=email,
        username=username,
        location=_clean_str(payload.get("location")),
        bio=bio or f"HuggingFace Creator with {len(models)} models.",
        skills=skills,
        profile_url=_clean_str(payload.get("profile_url")) or f"https://huggingface.co/{username}",
        raw=payload,
    )


def normalize_conference_author(payload: dict[str, Any], extra_skills: Optional[list[str]] = None) -> NormalizedIdentity:
    """Normalize a conference connector payload into a NormalizedIdentity.

    The identifier is the author's full name (e.g. "Andrej Karpathy") since
    conference proceedings don't have login handles.
    """
    author = _clean_str(payload.get("author")) or _clean_str(payload.get("query"))
    if not author:
        raise ValueError("Conference payload missing required 'author' field")

    papers = payload.get("papers", [])
    all_topics = payload.get("topics", [])

    # Build a short bio from the paper list
    conferences_str = ", ".join(
        sorted({p.get("conference", "") for p in papers if p.get("conference")})
    )
    bio = f"Conference researcher. Published at: {conferences_str}." if conferences_str else "Conference researcher."

    skills = extract_skills(bio, " ".join(all_topics), extra=extra_skills)

    return NormalizedIdentity(
        source="conference",
        source_id=author,
        full_name=author,
        primary_email=None,
        username=author,
        bio=bio,
        skills=skills,
        profile_url=_clean_str(payload.get("profile_url"))
        or f"https://scholar.google.com/scholar?q={author.replace(' ', '+')}",
        raw=payload,
    )
