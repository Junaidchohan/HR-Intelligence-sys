"""
Seeds a demo rubric + job requisition + two candidates ingested from the
offline GitHub fixtures, then runs a screening. Safe to re-run (ingestion is
idempotent; rubric/job creation is skipped if a rubric with the same name
already exists).

Run with:  python -m app.seed
"""
from __future__ import annotations

from app.db import Base, SessionLocal, engine
from app.models import JobRequisition, Rubric as RubricModel
from app.rubric.rubric import Rubric, RubricCriterion
from app.screening.screening_agent import run_screening
from app.services.ingestion import ingest_github_candidate


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        rubric = db.query(RubricModel).filter(RubricModel.name == "Backend Engineer").first()
        if not rubric:
            criteria = [
                RubricCriterion(name="Core Language", weight=0.5, required_skills=["python", "go"], min_evidence_count=2),
                RubricCriterion(name="Infra", weight=0.5, required_skills=["docker", "kubernetes"], min_evidence_count=1),
            ]
            Rubric(name="Backend Engineer", criteria=criteria).validate()
            rubric = RubricModel(
                name="Backend Engineer",
                criteria=[c.__dict__ for c in criteria],
            )
            db.add(rubric)
            db.commit()
            db.refresh(rubric)
            print(f"Created rubric #{rubric.id}")

        job = db.query(JobRequisition).filter(JobRequisition.title == "Senior Backend Engineer").first()
        if not job:
            job = JobRequisition(title="Senior Backend Engineer", description="Demo job requisition seeded for local testing.", rubric_id=rubric.id)
            db.add(job)
            db.commit()
            db.refresh(job)
            print(f"Created job requisition #{job.id}")

        result = ingest_github_candidate(db, "octocat")
        print(f"Ingested octocat -> candidate #{result['candidate_id']} ({result['resolution_reason']})")

        ingest_github_candidate(db, "janedoe")

        screening = run_screening(db, result["candidate_id"], job.id)
        print(f"Screening #{screening.id}: {screening.overall_score}/100 -> {screening.recommendation}")
        print(f"Summary: {screening.summary}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
