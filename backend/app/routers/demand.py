from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.audit import log_action
from app.core.security import get_current_user
from app.db import get_db
from app.models import Company, Opportunity, User
from app.schemas import CompanyCreate, CompanyOut, OpportunityCreate, OpportunityOut

router = APIRouter(tags=["demand"])


def compute_urgency_band(days_open: int) -> str:
    """Computes urgency band based on days open per demand-side spec:
    1-6 days: Monitor
    7-13 days: Warming
    14-18 days: Action now
    20+ days: Follow-up
    """
    if days_open <= 6:
        return "Monitor"
    elif days_open <= 13:
        return "Warming"
    elif days_open <= 18:
        return "Action now"
    else:
        return "Follow-up"


# ---------------------------------------------------------------------------
# Companies CRUD
# ---------------------------------------------------------------------------

@router.post("/companies", response_model=CompanyOut)
def create_company(
    payload: CompanyCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Company name is required")

    company = Company(
        name=payload.name.strip(),
        domain=payload.domain.strip() if payload.domain else None,
        funding_stage=payload.funding_stage or "Series A",
        headcount=payload.headcount,
        growth_rate=payload.growth_rate,
        tier=payload.tier or "B",
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    log_action(db, action="create_company", entity_type="company", entity_id=str(company.id), user_id=user.id)
    return company


@router.get("/companies", response_model=list[CompanyOut])
def list_companies(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Company).order_by(Company.created_at.desc()).all()


@router.get("/companies/{company_id}", response_model=CompanyOut)
def get_company(
    company_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.delete("/companies/{company_id}", status_code=204)
def delete_company(
    company_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    company = db.get(Company, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    db.delete(company)
    db.commit()
    log_action(db, action="delete_company", entity_type="company", entity_id=str(company_id), user_id=user.id)
    return


# ---------------------------------------------------------------------------
# Opportunities CRUD
# ---------------------------------------------------------------------------

@router.post("/opportunities", response_model=OpportunityOut)
def create_opportunity(
    payload: OpportunityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    company = db.get(Company, payload.company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    if not payload.role_archetype.strip():
        raise HTTPException(status_code=400, detail="Role archetype is required")

    days_open = 0  # Hardcoded on creation per spec
    urgency = compute_urgency_band(days_open)

    opp = Opportunity(
        company_id=payload.company_id,
        role_archetype=payload.role_archetype.strip(),
        days_open=days_open,
        urgency_band=payload.urgency_band or urgency,
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    log_action(db, action="create_opportunity", entity_type="opportunity", entity_id=str(opp.id), user_id=user.id)
    return opp


@router.get("/opportunities", response_model=list[OpportunityOut])
def list_opportunities(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Opportunity).order_by(Opportunity.created_at.desc()).all()


@router.delete("/opportunities/{opp_id}", status_code=204)
def delete_opportunity(
    opp_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    opp = db.get(Opportunity, opp_id)
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    db.delete(opp)
    db.commit()
    log_action(db, action="delete_opportunity", entity_type="opportunity", entity_id=str(opp_id), user_id=user.id)
    return
