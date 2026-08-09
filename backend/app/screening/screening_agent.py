"""
Screening agent.

Orchestrates: load candidate + evidence -> run rubric scoring (deterministic,
see app/rubric/rubric.py) -> validate every skill claim used in scoring
against evidence text via the citation validator -> optionally generate a
short natural-language summary with Claude (only if ANTHROPIC_API_KEY is
set; the numeric score/recommendation NEVER comes from the LLM, only the
prose summary does, so screening results stay reproducible and auditable
even when the LLM is unavailable).

Required environment variable for the optional LLM summary: ANTHROPIC_API_KEY
"""
from __future__ import annotations

import os

from sqlalchemy.orm import Session

from app.citation.validate import Citation, validate_batch
from app.config import settings
from app.core.audit import log_action
from app.models import Candidate, Evidence, JobRequisition, Rubric as RubricModel, Screening
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


def _llm_summary(candidate: Candidate, job: JobRequisition | None, score: float, recommendation: str) -> str | None:
    if not settings.screening_use_llm_summary or not settings.anthropic_api_key:
        return None
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        job_title = job.title if job else "Custom Rubric"
        prompt = (
            f"Candidate: {candidate.full_name}. Skills: {', '.join(candidate.skills or [])}. "
            f"Job: {job_title}. Overall rubric score: {score}/100 ({recommendation}). "
            f"Write a 2-sentence factual screening summary for a recruiter. "
            f"Do not invent skills or experience not listed above."
        )
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}],
        )
        parts = [b.text for b in resp.content if getattr(b, "type", None) == "text"]
        return "\n".join(parts).strip() or None
    except Exception as exc:  # pragma: no cover - network/credential dependent
        return f"(LLM summary unavailable: {exc})"


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

    summary = _llm_summary(candidate, job, result.overall_score, result.recommendation)
    if summary is None:
        top = ", ".join(cs.name for cs in result.criterion_scores if cs.raw_score >= 70) or "no criteria"
        summary = (
            f"Rule-based screen: {result.recommendation.replace('_', ' ')} "
            f"({result.overall_score}/100). Strongest on: {top}."
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
