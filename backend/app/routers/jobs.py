from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import get_current_user
from app.db import get_db
from app.models import Candidate, JobRequisition, Rubric as RubricModel, Screening, User
from app.rubric.rubric import Rubric, RubricCriterion
from app.schemas import JobCreate, JobOut, JobUpdate, LeaderboardEntry, RubricCreate, RubricOut

router = APIRouter(tags=["jobs"])


# ---------------------------------------------------------------------------
# Rubrics
# ---------------------------------------------------------------------------

@router.post("/rubrics", response_model=RubricOut)
def create_rubric(payload: RubricCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    criteria_dicts = [c.model_dump() for c in payload.criteria]
    rubric_domain = Rubric(name=payload.name, criteria=[RubricCriterion(**c) for c in criteria_dicts])
    try:
        rubric_domain.validate()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rubric = RubricModel(name=payload.name, criteria=criteria_dicts)
    db.add(rubric)
    db.commit()
    db.refresh(rubric)
    log_action(db, action="create_rubric", entity_type="rubric", entity_id=rubric.id, user_id=user.id)
    return rubric


@router.get("/rubrics", response_model=list[RubricOut])
def list_rubrics(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(RubricModel).all()


@router.put("/rubrics/{rubric_id}", response_model=RubricOut)
def update_rubric(rubric_id: int, payload: RubricCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rubric = db.get(RubricModel, rubric_id)
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    criteria_dicts = [c.model_dump() for c in payload.criteria]
    rubric_domain = Rubric(name=payload.name, criteria=[RubricCriterion(**c) for c in criteria_dicts])
    try:
        rubric_domain.validate()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    rubric.name = payload.name
    rubric.criteria = criteria_dicts
    db.commit()
    db.refresh(rubric)
    log_action(db, action="update_rubric", entity_type="rubric", entity_id=rubric.id, user_id=user.id)
    return rubric


@router.delete("/rubrics/{rubric_id}", status_code=204)
def delete_rubric(rubric_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rubric = db.get(RubricModel, rubric_id)
    if not rubric:
        raise HTTPException(status_code=404, detail="Rubric not found")
    db.delete(rubric)
    db.commit()
    log_action(db, action="delete_rubric", entity_type="rubric", entity_id=rubric_id, user_id=user.id)
    return


# ---------------------------------------------------------------------------
# Job Requisitions
# ---------------------------------------------------------------------------

@router.post("/job-requisitions", response_model=JobOut)
def create_job(payload: JobCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not db.query(RubricModel).get(payload.rubric_id):
        raise HTTPException(status_code=404, detail="Rubric not found")
    job = JobRequisition(
        title=payload.title,
        description=payload.description,
        rubric_id=payload.rubric_id,
        client_name=payload.client_name,
        priority=payload.priority or "Medium",
        status="active",
    )
    db.add(job)
    db.commit()
    db.refresh(job)
    log_action(db, action="create_job", entity_type="job_requisition", entity_id=job.id, user_id=user.id)
    return job


@router.get("/job-requisitions", response_model=list[JobOut])
def list_jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(JobRequisition).order_by(JobRequisition.created_at.desc()).all()


@router.put("/job-requisitions/{job_id}", response_model=JobOut)
def update_job(job_id: int, payload: JobUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.get(JobRequisition, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if payload.title is not None:
        job.title = payload.title
    if payload.description is not None:
        job.description = payload.description
    if payload.rubric_id is not None:
        if not db.query(RubricModel).get(payload.rubric_id):
            raise HTTPException(status_code=404, detail="Rubric not found")
        job.rubric_id = payload.rubric_id
    if payload.client_name is not None:
        job.client_name = payload.client_name
    if payload.priority is not None:
        job.priority = payload.priority
    if payload.status is not None:
        job.status = payload.status
    db.commit()
    db.refresh(job)
    log_action(db, action="update_job", entity_type="job_requisition", entity_id=job.id, user_id=user.id)
    return job


@router.delete("/job-requisitions/{job_id}", status_code=204)
def delete_job(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.get(JobRequisition, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    db.delete(job)
    db.commit()
    log_action(db, action="delete_job", entity_type="job_requisition", entity_id=job_id, user_id=user.id)
    return


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

@router.get("/job-requisitions/leaderboard/{job_id}", response_model=list[LeaderboardEntry])
def get_leaderboard(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.get(JobRequisition, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    screenings = (
        db.query(Screening)
        .filter(Screening.job_id == job_id)
        .order_by(Screening.overall_score.desc())
        .all()
    )

    result: list[LeaderboardEntry] = []
    for rank, s in enumerate(screenings, start=1):
        candidate = db.get(Candidate, s.candidate_id)
        result.append(
            LeaderboardEntry(
                rank=rank,
                candidate_id=s.candidate_id,
                candidate_name=candidate.full_name if candidate else f"Candidate #{s.candidate_id}",
                location=candidate.location if candidate else None,
                overall_score=s.overall_score,
                recommendation=s.recommendation,
                job_id=s.job_id,
            )
        )
    return result
