from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_admin
from app.db import get_db
from app.models import AuditLog, BackgroundJob, User

router = APIRouter(tags=["background"])


class EnqueueJobRequest(BaseModel):
    job_type: str
    payload: dict = {}


@router.post("/jobs/enqueue")
def enqueue_job(req: EnqueueJobRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = BackgroundJob(job_type=req.job_type, payload=req.payload)
    db.add(job)
    db.commit()
    db.refresh(job)
    return {"id": job.id, "status": job.status}


@router.get("/jobs/{job_id}")
def get_job_status(job_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    job = db.query(BackgroundJob).get(job_id)
    if not job:
        return {"error": "not found"}
    return {"id": job.id, "job_type": job.job_type, "status": job.status, "result": job.result, "error": job.error}


@router.get("/audit-logs")
def list_audit_logs(limit: int = 100, db: Session = Depends(get_db), user: User = Depends(require_admin)):
    rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": r.id,
            "user_id": r.user_id,
            "action": r.action,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "details": r.details,
            "created_at": r.created_at.isoformat(),
        }
        for r in rows
    ]
