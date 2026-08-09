from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import Evidence


def list_evidence_for_candidate(db: Session, candidate_id: int) -> list[Evidence]:
    return db.query(Evidence).filter(Evidence.candidate_id == candidate_id).order_by(Evidence.collected_at.desc()).all()
