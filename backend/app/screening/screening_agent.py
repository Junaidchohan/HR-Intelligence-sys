"""
Screening agent.

Orchestrates: load candidate + evidence -> run rubric scoring (deterministic,
see app/rubric/rubric.py) -> validate every skill claim used in scoring
against evidence text via the citation validator -> optionally generate a
short natural-language summary with Claude (only if ANTHROPIC_API_KEY is
set as an env var OR stored via the /settings UI; the numeric
score/recommendation NEVER comes from the LLM, only the prose summary does,
so screening results stay reproducible and auditable even when the LLM is
unavailable).

API key resolution order (env var wins for cold-start speed):
  1. ANTHROPIC_API_KEY / OPENAI_API_KEY env var (set on Render dashboard)
  2. Encrypted value stored in IntegrationSettings DB table via /settings UI
"""
from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.citation.validate import Citation, validate_batch
from app.config import settings
from app.core.audit import log_action
from app.models import Candidate, Evidence, IntegrationSettings, JobRequisition, Rubric as RubricModel, Screening
from app.rubric.rubric import Rubric, RubricCriterion, score_candidate


def _build_rubric(model: RubricModel) -> Rubric:
    criteria = [
        RubricCriterion(
            name=c["name"],
            weight=c["weight"],
            required_skills=c.get("required_skills", []),
            min_evidence_count=c.get("min_evidence_count", 0),
            description=c.get("description", ""),
        )
        for c in model.criteria
    ]
    return Rubric(name=model.name, criteria=criteria)


def _validate_citations(candidate: Candidate, evidence_list: list[Evidence], skills_used: list[str]) -> float:
    citations = []
    for ev in evidence_list:
        matched_skill = next((s for s in skills_used if s.lower() in (ev.snippet or "").lower()), None)
        citations.append(
            Citation(evidence_id=ev.id, url=ev.url, title=ev.title, snippet=ev.snippet, claimed_skill=matched_skill)
        )
    if not citations:
        return 0.0
    results = validate_batch(citations)
    valid = sum(1 for r in results if r.valid)
    return round(valid / len(results), 4)


def _resolve_key(db: Session, env_key: str, db_field: str) -> str | None:
    """Resolve an API key: env var first (fast path), then DB-stored encrypted value.

    This bridges the gap between Render env vars and keys saved via the
    /settings UI (which are stored encrypted in the IntegrationSettings table).

    Args:
        db:       SQLAlchemy session
        env_key:  Name of the env var to check first (e.g. 'ANTHROPIC_API_KEY')
        db_field: Column name on IntegrationSettings (e.g. 'encrypted_anthropic_api_key')
    """
    # Fast path: env var already present (set on Render dashboard / .env)
    val = os.environ.get(env_key) or getattr(settings, env_key.lower(), None)
    if val:
        print(f"[Screening] Found {env_key} in environment: True", flush=True)
        return val

    # Slow path: look up any IntegrationSettings row that has the field populated
    from app.core.encryption import decrypt_token
    row = (
        db.query(IntegrationSettings)
        .filter(getattr(IntegrationSettings, db_field).isnot(None))
        .first()
    )
    if row:
        decrypted = decrypt_token(getattr(row, db_field))
        found = bool(decrypted)
        print(f"[Screening] Found {env_key} in DB settings: {found}", flush=True)
        return decrypted

    print(f"[Screening] Found {env_key}: False (not in env or DB)", flush=True)
    return None


def _llm_summary(
    candidate: Candidate,
    job: JobRequisition | None,
    score: float,
    recommendation: str,
    db: Session | None = None,
) -> str | None:
    """Generate an AI executive summary via Anthropic (primary) or OpenAI (fallback).

    API keys are resolved from env vars first, then the encrypted DB store.
    Returns None if neither key is available, triggering the rule-based fallback.
    SCREENING_USE_LLM_SUMMARY is always treated as True — set it to False only
    in test environments where you want deterministic output.
    """
    # Force-enable LLM summary regardless of config (can be overridden by env var
    # SCREENING_USE_LLM_SUMMARY=false in edge cases)
    use_llm = os.environ.get("SCREENING_USE_LLM_SUMMARY", "true").lower() != "false"
    if not use_llm:
        return None

    job_title = job.title if job else "Custom Rubric"
    prompt = (
        f"Candidate: {candidate.full_name}. "
        f"Skills: {', '.join(candidate.skills or [])}. "
        f"Job: {job_title}. Overall rubric score: {score}/100 (verdict: {recommendation}). "
        f"Write exactly 2 sentences for a recruiter: "
        f"sentence 1 describes the candidate's strongest skills backed by evidence; "
        f"sentence 2 identifies the key gap or risk. "
        f"Be factual. Do not invent skills or experience not listed above."
    )

    # --- Primary: Anthropic Claude ---
    anthropic_key = _resolve_key(db, "ANTHROPIC_API_KEY", "encrypted_anthropic_api_key") if db else settings.anthropic_api_key
    if anthropic_key:
        try:
            import anthropic  # type: ignore
            client = anthropic.Anthropic(api_key=anthropic_key)
            resp = client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
            text = "\n".join(parts).strip()
            if text:
                print(f"[Screening] AI summary generated via Anthropic Claude ({len(text)} chars)", flush=True)
                return text
        except Exception as exc:  # pragma: no cover
            print(f"[Screening] Anthropic error: {exc}", flush=True)
            # fall through to OpenAI

    # --- Fallback: OpenAI ---
    openai_key = _resolve_key(db, "OPENAI_API_KEY", "encrypted_openai_api_key") if db else settings.openai_api_key
    if openai_key:
        try:
            import openai as openai_lib  # type: ignore
            client = openai_lib.OpenAI(api_key=openai_key)
            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                max_tokens=200,
                messages=[{"role": "user", "content": prompt}],
            )
            text = resp.choices[0].message.content.strip()
            if text:
                print(f"[Screening] AI summary generated via OpenAI ({len(text)} chars)", flush=True)
                return text
        except Exception as exc:  # pragma: no cover
            print(f"[Screening] OpenAI error: {exc}", flush=True)

    print("[Screening] No AI key available — using analytical fallback summary", flush=True)
    return None  # caller builds analytical fallback



def run_screening(db: Session, candidate_id: int, job_id: int | None = None, rubric_id: int | None = None, user_id: int | None = None) -> Screening:
    candidate = db.query(Candidate).get(candidate_id)
    if not candidate:
        raise ValueError("candidate not found")

    # Dual-input support: load job req, primary rubric model, or both
    job = None
    rubric_model = None

    if job_id:
        job = db.query(JobRequisition).get(job_id)
        if not job:
            raise ValueError("job not found")
        # If rubric_id is also supplied, prioritize it, otherwise fallback to job's rubric_id
        active_rubric_id = rubric_id if rubric_id else job.rubric_id
        rubric_model = db.query(RubricModel).get(active_rubric_id)
    elif rubric_id:
        rubric_model = db.query(RubricModel).get(rubric_id)
    else:
        raise ValueError("Either job_id or rubric_id must be provided")

    if not rubric_model:
        raise ValueError("rubric not found")

    rubric = _build_rubric(rubric_model)

    evidence_list = db.query(Evidence).filter(Evidence.candidate_id == candidate_id).all()
    result = score_candidate(rubric, candidate.skills or [], evidence_count=len(evidence_list))

    all_required_skills = [s for c in rubric.criteria for s in c.required_skills]
    citation_ratio = _validate_citations(candidate, evidence_list, all_required_skills)

    # Apply semantic job boosting and match confidence calculation
    semantic_boost = 0.0
    confidence_score = 0.0

    if job:
        import re
        stop_words = {'and', 'the', 'of', 'in', 'to', 'for', 'with', 'a', 'an', 'is', 'on', 'at', 'or', 'by', 'from', 'this', 'that', 'our', 'your', 'we', 'you', 'are', 'be', 'will', 'as', 'has', 'have', 'was', 'were', 'it'}
        
        def get_keywords(text: str) -> set[str]:
            if not text:
                return set()
            words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
            return {w for w in words if w not in stop_words}

        job_text = f"{job.title or ''} {job.description or ''}"
        job_keywords = get_keywords(job_text)

        candidate_bio_keywords = get_keywords(candidate.bio or "")
        candidate_skills = {s.lower() for s in (candidate.skills or [])}
        evidence_text = " ".join([f"{ev.title or ''} {ev.snippet or ''}" for ev in evidence_list])
        evidence_keywords = get_keywords(evidence_text)

        if job_keywords:
            bio_skills_overlap = job_keywords.intersection(candidate_bio_keywords.union(candidate_skills))
            evidence_overlap = job_keywords.intersection(evidence_keywords)
            total_overlap = bio_skills_overlap.union(evidence_overlap)
            match_ratio = len(total_overlap) / len(job_keywords)
        else:
            match_ratio = 0.0

        # Boost up to 15% based on job criteria semantic match ratio
        if match_ratio > 0:
            semantic_boost = min(match_ratio * 25.0, 15.0)

        # Apply boost to overall score and individual criteria
        result.overall_score = min(round(result.overall_score + semantic_boost, 1), 100.0)
        for cs in result.criterion_scores:
            cs.raw_score = min(round(cs.raw_score + semantic_boost, 1), 100.0)
            cs.weighted_score = min(round(cs.weighted_score + (semantic_boost * cs.weight), 1), 100.0)

        # Calculate dual-input confidence score
        confidence_score = 0.6 * result.overall_score + 0.2 * (citation_ratio * 100) + 0.2 * (match_ratio * 100)
    else:
        # Fallback confidence score when only rubric is provided
        confidence_score = 0.7 * result.overall_score + 0.3 * (citation_ratio * 100)

    confidence_score = round(min(max(confidence_score, 0.0), 100.0), 1)

    summary = _llm_summary(candidate, job, result.overall_score, result.recommendation, db=db)
    if summary is None:
        # Build a detailed analytical fallback with strengths and gaps
        strong = [cs.name for cs in result.criterion_scores if cs.raw_score >= 70]
        weak   = [cs.name for cs in result.criterion_scores if cs.raw_score < 60]
        top_skills = ", ".join(candidate.skills[:5]) if candidate.skills else "no listed skills"
        strength_text = f"strong performance in {', '.join(strong)}" if strong else "no criteria scoring above 70"
        gap_text = f"gaps identified in {', '.join(weak)}" if weak else "no major scoring gaps"
        summary = (
            f"{candidate.full_name or 'This candidate'} scores {result.overall_score}/100 ({result.recommendation}) "
            f"with {strength_text}; primary skills include {top_skills}. "
            f"Key assessment note: {gap_text} based on the rubric criteria applied."
        )

    screening = Screening(
        candidate_id=candidate_id,
        job_id=job_id,
        rubric_id=rubric_model.id,
        overall_score=result.overall_score,
        recommendation=result.recommendation,
        criterion_scores=[cs.__dict__ for cs in result.criterion_scores],
        summary=summary,
        citation_valid_ratio=citation_ratio,
        confidence_score=confidence_score,
    )
    db.add(screening)
    db.commit()
    db.refresh(screening)

    log_action(
        db,
        action="run_screening",
        entity_type="screening",
        entity_id=screening.id,
        user_id=user_id,
        details={"candidate_id": candidate_id, "job_id": job_id, "rubric_id": rubric_model.id, "score": result.overall_score, "semantic_boost": semantic_boost},
    )
    return screening
