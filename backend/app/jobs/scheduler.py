from __future__ import annotations

import datetime
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler  # type: ignore
from sqlalchemy.orm import Session  # type: ignore

from app.db import SessionLocal
from app.models import Opportunity
from app.routers.demand import compute_urgency_band

scheduler = BackgroundScheduler()


def recompute_urgency_job(db: Optional[Session] = None) -> int:
    """Daily recompute job for demand-side opportunities:
    1. Calculates days_open = (now - first_seen_at).days
    2. Updates urgency_band per spec (Monitor, Warming, Action now, Follow-up)
    3. Returns number of opportunities updated
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        now_utc = datetime.datetime.utcnow()
        opportunities = db.query(Opportunity).all()
        updated_count = 0

        for opp in opportunities:
            days_open = max(0, (now_utc - opp.first_seen_at).days)
            new_urgency = compute_urgency_band(days_open)

            if opp.days_open != days_open or opp.urgency_band != new_urgency:
                opp.days_open = days_open
                opp.urgency_band = new_urgency
                updated_count += 1

        if updated_count > 0:
            db.commit()

        print(f"[Daily Job] Recomputed urgency for {len(opportunities)} opportunities ({updated_count} updated).")
        return updated_count
    finally:
        if should_close:
            db.close()


def start_scheduler() -> None:
    """Starts the APScheduler background scheduler for daily automated jobs."""
    if not scheduler.running:
        # Schedule daily midnight job (00:00 UTC)
        scheduler.add_job(
            recompute_urgency_job,
            trigger="cron",
            hour=0,
            minute=0,
            id="daily_urgency_recompute",
            replace_existing=True,
        )
        scheduler.start()
        print("[Scheduler] Started APScheduler background scheduler (daily midnight urgency recompute).")


def shutdown_scheduler() -> None:
    """Gracefully shuts down the APScheduler background scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        print("[Scheduler] Shut down APScheduler background scheduler.")
