from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def migrate_schema() -> None:
    """Safely add new columns to existing tables without full Alembic migration.
    Uses ALTER TABLE … ADD COLUMN which is a no-op if the column exists (SQLite ≥3.37)
    or is guarded by a try/except for older versions.
    """
    new_columns = [
        ("job_requisitions", "client_name", "VARCHAR(255)"),
        ("job_requisitions", "priority",    "VARCHAR(32) DEFAULT 'Medium'"),
        ("job_requisitions", "status",      "VARCHAR(32) DEFAULT 'active'"),
        ("screenings", "confidence_score", "FLOAT"),
    ]
    with engine.connect() as conn:
        for table, col, col_def in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}"))
                conn.commit()
            except Exception:
                # Column already exists — safe to ignore
                pass

