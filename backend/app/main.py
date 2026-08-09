from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.security import hash_password
from app.db import Base, SessionLocal, engine, migrate_schema
from app.models import User, UserRole
from app.routers import auth, background, candidates, jobs, screening, settings as settings_router
from app.config import settings

app = FastAPI(title="AI Talent Intelligence Platform", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(candidates.router)
app.include_router(jobs.router)
app.include_router(screening.router)
app.include_router(background.router)
app.include_router(settings_router.router)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    migrate_schema()
    _ensure_admin_user()


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
