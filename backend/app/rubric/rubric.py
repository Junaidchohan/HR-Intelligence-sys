"""
Rubric scoring engine.

A Rubric is a set of weighted criteria. Each criterion is scored 0-100
against candidate evidence using deterministic, explainable rules (skill
presence, evidence-count thresholds, keyword matches). This is intentionally
rule-based (no LLM call) so scoring is reproducible, fast, and auditable;
the screening agent layer on top of this may optionally add an LLM-written
narrative summary, but never lets the LLM change the numeric score.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


@dataclass
class RubricCriterion:
    name: str
    weight: float  # 0-1, all criteria weights should sum to 1.0
    required_skills: list[str] = field(default_factory=list)
    min_evidence_count: int = 0
    description: str = ""


@dataclass
class Rubric:
    name: str
    criteria: list[RubricCriterion]

    def validate(self) -> None:
        total = sum(c.weight for c in self.criteria)
        if not (0.99 <= total <= 1.01):
            raise ValueError(f"Rubric '{self.name}' weights must sum to 1.0, got {total}")


@dataclass
class CriterionScore:
    name: str
    weight: float
    raw_score: float  # 0-100
    weighted_score: float
    matched_skills: list[str]
    explanation: str


@dataclass
class ScoreResult:
    overall_score: float  # 0-100
    criterion_scores: list[CriterionScore]
    recommendation: str


def _score_criterion(criterion: RubricCriterion, candidate_skills: set[str], evidence_count: int) -> CriterionScore:
    matched = [s for s in criterion.required_skills if s.lower() in candidate_skills]
    skill_component = 0.0
    if criterion.required_skills:
        skill_component = 100.0 * (len(matched) / len(criterion.required_skills))
    else:
        skill_component = 100.0  # no skill requirement -> full marks on this axis

    evidence_component = 100.0
    if criterion.min_evidence_count > 0:
        evidence_component = min(100.0, 100.0 * (evidence_count / criterion.min_evidence_count))

    # Blend: skills matter more than raw evidence volume.
    raw_score = round(0.7 * skill_component + 0.3 * evidence_component, 2)
    weighted = round(raw_score * criterion.weight, 2)

    if criterion.required_skills:
        explanation = f"Matched {len(matched)}/{len(criterion.required_skills)} required skills: {matched or 'none'}."
    else:
        explanation = "No specific skill requirement for this criterion."
    if criterion.min_evidence_count:
        explanation += f" Evidence items: {evidence_count} (target {criterion.min_evidence_count})."

    return CriterionScore(
        name=criterion.name,
        weight=criterion.weight,
        raw_score=raw_score,
        weighted_score=weighted,
        matched_skills=matched,
        explanation=explanation,
    )


def _recommendation_for(score: float) -> str:
    if score >= 80:
        return "strong_match"
    if score >= 60:
        return "possible_match"
    if score >= 40:
        return "weak_match"
    return "not_a_match"


def score_candidate(rubric: Rubric, candidate_skills: list[str], evidence_count: int) -> ScoreResult:
    rubric.validate()
    skills_set = {s.lower() for s in candidate_skills}
    criterion_scores = [_score_criterion(c, skills_set, evidence_count) for c in rubric.criteria]
    overall = round(sum(cs.weighted_score for cs in criterion_scores), 2)
    return ScoreResult(
        overall_score=overall,
        criterion_scores=criterion_scores,
        recommendation=_recommendation_for(overall),
    )
