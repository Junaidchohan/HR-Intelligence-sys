from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import get_current_user
from app.db import get_db
from app.models import Candidate, Company, Touch, User
from app.schemas import TouchCreate, TouchOut

router = APIRouter(tags=["touches"])


@router.post("/touches", response_model=TouchOut)
def create_touch(
    payload: TouchCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    entity_type = payload.entity_type.lower().strip()
    if entity_type not in ("candidate", "company"):
        raise HTTPException(status_code=400, detail="entity_type must be 'candidate' or 'company'")

    if entity_type == "candidate":
        candidate = db.get(Candidate, payload.entity_id)
        if not candidate:
            raise HTTPException(status_code=404, detail="Candidate not found")
    elif entity_type == "company":
        company = db.get(Company, payload.entity_id)
        if not company:
            raise HTTPException(status_code=404, detail="Company not found")

    if not payload.channel.strip():
        raise HTTPException(status_code=400, detail="Channel is required")
    if not payload.outcome.strip():
        raise HTTPException(status_code=400, detail="Outcome is required")

    touch = Touch(
        entity_type=entity_type,
        entity_id=payload.entity_id,
        channel=payload.channel.strip(),
        outcome=payload.outcome.strip(),
        notes=payload.notes.strip() if payload.notes else None,
    )
    db.add(touch)
    db.commit()
    db.refresh(touch)

    log_action(db, action="create_touch", entity_type=entity_type, entity_id=str(touch.id), user_id=user.id)
    return touch


@router.get("/touches", response_model=list[TouchOut])
def list_touches(
    entity_type: Optional[str] = Query(None, description="Filter by candidate or company"),
    entity_id: Optional[int] = Query(None, description="Filter by entity ID"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(Touch)
    if entity_type:
        query = query.filter(Touch.entity_type == entity_type.lower().strip())
    if entity_id:
        query = query.filter(Touch.entity_id == entity_id)
    return query.order_by(Touch.created_at.desc()).all()


@router.get("/touches/{touch_id}", response_model=TouchOut)
def get_touch(
    touch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    touch = db.get(Touch, touch_id)
    if not touch:
        raise HTTPException(status_code=404, detail="Touch event not found")
    return touch


@router.delete("/touches/{touch_id}", status_code=204)
def delete_touch(
    touch_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    touch = db.get(Touch, touch_id)
    if not touch:
        raise HTTPException(status_code=404, detail="Touch event not found")
    db.delete(touch)
    db.commit()
    log_action(db, action="delete_touch", entity_type=touch.entity_type, entity_id=str(touch_id), user_id=user.id)
    return
