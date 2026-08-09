from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import get_db
from app.models import Screening, User
from app.schemas import ScreenRequest, ScreeningOut, BatchScreenRequest
from app.screening.screening_agent import run_screening
from app.services.ingestion import ingest_github_candidate
import json
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/screenings", tags=["screening"])


@router.post("", response_model=ScreeningOut)
def screen(payload: ScreenRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        result = run_screening(db, payload.candidate_id, job_id=payload.job_id, rubric_id=payload.rubric_id, user_id=user.id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return result


@router.get("/candidate/{candidate_id}", response_model=list[ScreeningOut])
def list_for_candidate(candidate_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Screening).filter(Screening.candidate_id == candidate_id).order_by(Screening.created_at.desc()).all()


@router.get("/job/{job_id}", response_model=list[ScreeningOut])
def list_for_job(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Screening).filter(Screening.job_id == job_id).order_by(Screening.overall_score.desc()).all()


@router.post("/batch")
def batch_screen(payload: BatchScreenRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    def generate():
        for username in payload.usernames:
            yield json.dumps({"username": username, "status": "processing"}) + "\n"
            try:
                result_ingest = ingest_github_candidate(db, username, user.id)
                candidate_id = result_ingest["candidate_id"]
                result_score = run_screening(db, candidate_id, job_id=None, rubric_id=payload.rubric_id, user_id=user.id)
                
                # We need to fetch the full name from Candidate model
                # or we can just use username since ingestion might not populate full_name always
                from app.models import Candidate
                candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
                full_name = candidate.full_name if candidate and candidate.full_name else username
                
                yield json.dumps({
                    "username": username,
                    "status": "complete",
                    "score": result_score.overall_score,
                    "name": full_name,
                    "avatar": f"https://github.com/{username}.png"
                }) + "\n"
            except Exception as e:
                yield json.dumps({
                    "username": username,
                    "status": "failed",
                    "error": str(e)
                }) + "\n"
    return StreamingResponse(generate(), media_type="application/x-ndjson")
