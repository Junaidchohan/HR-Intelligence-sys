from __future__ import annotations

import datetime
import os

os.environ["GITHUB_OFFLINE_FIXTURES"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_talent.db"

# pyrefly: ignore [missing-import]
import pytest
from app.db import Base, SessionLocal, engine
from app.jobs.scheduler import recompute_urgency_job
from app.models import Company, Opportunity


def test_daily_urgency_recompute_job():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Create company
    comp = Company(name="Schedule Corp", tier="S")
    db.add(comp)
    db.commit()

    # 2. Create opportunities with different first_seen_at dates to simulate days_open
    now = datetime.datetime.utcnow()

    opp_monitor = Opportunity(
        company_id=comp.id,
        role_archetype="Agentic Engineer",
        first_seen_at=now - datetime.timedelta(days=3),
        days_open=0,
        urgency_band="Monitor",
    )
    opp_warming = Opportunity(
        company_id=comp.id,
        role_archetype="Applied AI Engineer",
        first_seen_at=now - datetime.timedelta(days=10),
        days_open=0,
        urgency_band="Monitor",
    )
    opp_action = Opportunity(
        company_id=comp.id,
        role_archetype="AI Solutions Architect",
        first_seen_at=now - datetime.timedelta(days=15),
        days_open=0,
        urgency_band="Monitor",
    )
    opp_followup = Opportunity(
        company_id=comp.id,
        role_archetype="VP of AI Engineering",
        first_seen_at=now - datetime.timedelta(days=22),
        days_open=0,
        urgency_band="Monitor",
    )

    db.add_all([opp_monitor, opp_warming, opp_action, opp_followup])
    db.commit()

    # 3. Run recompute job
    updated_count = recompute_urgency_job(db=db)
    assert updated_count >= 3  # at least the 3 non-monitor ones got updated

    # 4. Verify updated urgency bands per spec
    db.refresh(opp_monitor)
    db.refresh(opp_warming)
    db.refresh(opp_action)
    db.refresh(opp_followup)

    assert opp_monitor.urgency_band == "Monitor"
    assert opp_warming.urgency_band == "Warming"
    assert opp_action.urgency_band == "Action now"
    assert opp_followup.urgency_band == "Follow-up"

    db.close()
