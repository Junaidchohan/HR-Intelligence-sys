from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.core.security import hash_password
from app.db import Base, SessionLocal, engine, migrate_schema
from app.jobs.scheduler import shutdown_scheduler, start_scheduler
from app.models import User, UserRole
from app.routers import auth, background, candidates, demand, jobs, screening, settings as settings_router, touches


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    _ensure_admin_user()
    start_scheduler()
    yield
    # Shutdown
    shutdown_scheduler()


app = FastAPI(title="AI Talent Intelligence Platform", version="0.1.0", lifespan=lifespan)

_EXTRA_ORIGINS = [o.strip() for o in os.environ.get("FRONTEND_URL", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://hr-intelligence-sys-one.vercel.app",        # Vercel production
        "https://hr-intelligence-sys-frontend.onrender.com", # Render frontend
        *_EXTRA_ORIGINS,  # Any extra domains via env (e.g. custom domain)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(demand.router)
app.include_router(screening.router)
app.include_router(background.router)
app.include_router(settings_router.router)
app.include_router(touches.router)


def _ensure_admin_user() -> None:
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.email == settings.admin_email).first():
            db.add(
                User(
                    email=settings.admin_email,
                    hashed_password=hash_password(settings.admin_password),
                    role=UserRole.admin,
                )
            )
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
