"""
Simple DB-backed background job worker. No Redis/Celery dependency: polls
the background_jobs table for pending rows and executes them in-process.

Run with:  python -m app.jobs.worker
Loops forever, polling every POLL_INTERVAL_SECONDS. Suitable for a single
worker container (see docker-compose.yml "worker" service). For real
production scale, swap this for Celery/RQ + Redis without changing the
handlers themselves.
"""
from __future__ import annotations

import logging
import time

from app.db import SessionLocal
from app.models import BackgroundJob, JobStatus
from app.services.ingestion import ingest_github_candidate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("worker")

POLL_INTERVAL_SECONDS = 2

HANDLERS = {
    "ingest_github": lambda db, payload: ingest_github_candidate(db, payload["identifier"]),
}


def process_one(db) -> bool:
    job = (
        db.query(BackgroundJob)
        .filter(BackgroundJob.status == JobStatus.pending)
        .order_by(BackgroundJob.created_at.asc())
        .first()
    )
    if not job:
        return False

    job.status = JobStatus.running
    db.commit()

    handler = HANDLERS.get(job.job_type)
    try:
        if not handler:
            raise ValueError(f"No handler registered for job_type={job.job_type}")
        result = handler(db, job.payload)
        job.status = JobStatus.done
        job.result = result
    except Exception as exc:  # noqa: BLE001
        logger.exception("Job %s failed", job.id)
        job.status = JobStatus.failed
        job.error = str(exc)
    db.commit()
    return True


def run_forever() -> None:
    logger.info("Worker started, polling every %ss", POLL_INTERVAL_SECONDS)
    while True:
        db = SessionLocal()
        try:
            worked = process_one(db)
        finally:
            db.close()
        if not worked:
            time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_forever()
