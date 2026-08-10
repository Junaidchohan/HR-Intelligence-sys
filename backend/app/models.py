from __future__ import annotations

import datetime
import enum

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


def now() -> datetime.datetime:
    return datetime.datetime.utcnow()


class UserRole(str, enum.Enum):
    admin = "admin"
    recruiter = "recruiter"


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.recruiter)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)


class Candidate(Base):
    """The canonical, entity-resolved candidate record."""
    __tablename__ = "candidates"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    primary_email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    skills: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, onupdate=now)

    identities: Mapped[list["CandidateIdentity"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")
    evidence: Mapped[list["Evidence"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")
    screenings: Mapped[list["Screening"]] = relationship(back_populates="candidate", cascade="all, delete-orphan")


class CandidateIdentity(Base):
    """A single raw, source-specific identity ingested for a candidate,
    prior to / as part of entity resolution. Multiple identities can point
    at the same canonical Candidate."""
    __tablename__ = "candidate_identities"
    __table_args__ = (UniqueConstraint("source", "source_id", name="uq_source_identity"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    source: Mapped[str] = mapped_column(String(64))
    source_id: Mapped[str] = mapped_column(String(255))
    username: Mapped[str | None] = mapped_column(String(255), nullable=True)
    raw_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    resolution_reason: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resolution_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"))
    ingested_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    candidate: Mapped["Candidate"] = relationship(back_populates="identities")


class Evidence(Base):
    __tablename__ = "evidence"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"))
    source: Mapped[str] = mapped_column(String(64))
    evidence_type: Mapped[str] = mapped_column(String(64))  # repo, bio, article, cert
    title: Mapped[str | None] = mapped_column(String(500), nullable=True)
    url: Mapped[str] = mapped_column(String(1000))
    snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    collected_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    candidate: Mapped["Candidate"] = relationship(back_populates="evidence")
    citation_checks: Mapped[list["CitationCheck"]] = relationship(back_populates="evidence", cascade="all, delete-orphan")


class CitationCheck(Base):
    __tablename__ = "citation_checks"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    evidence_id: Mapped[int] = mapped_column(ForeignKey("evidence.id"))
    claimed_skill: Mapped[str | None] = mapped_column(String(255), nullable=True)
    url_well_formed: Mapped[bool] = mapped_column(default=False)
    claim_supported: Mapped[bool | None] = mapped_column(nullable=True)
    valid: Mapped[bool] = mapped_column(default=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    checked_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    evidence: Mapped["Evidence"] = relationship(back_populates="citation_checks")


class Rubric(Base):
    __tablename__ = "rubrics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    criteria: Mapped[list] = mapped_column(JSON, default=list)  # list[{name, weight, required_skills, min_evidence_count, description}]
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    jobs: Mapped[list["JobRequisition"]] = relationship(back_populates="rubric")


class JobRequisition(Base):
    __tablename__ = "job_requisitions"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rubric_id: Mapped[int] = mapped_column(ForeignKey("rubrics.id"))
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    priority: Mapped[str | None] = mapped_column(String(32), nullable=True, default="Medium")  # High | Medium | Low
    status: Mapped[str] = mapped_column(String(32), default="active")  # active | filled
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    rubric: Mapped["Rubric"] = relationship(back_populates="jobs")
    screenings: Mapped[list["Screening"]] = relationship(back_populates="job")


class Screening(Base):
    __tablename__ = "screenings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    candidate_id: Mapped[int] = mapped_column(ForeignKey("candidates.id"))
    job_id: Mapped[int | None] = mapped_column(ForeignKey("job_requisitions.id"), nullable=True)
    rubric_id: Mapped[int | None] = mapped_column(ForeignKey("rubrics.id"), nullable=True)
    overall_score: Mapped[float] = mapped_column(Float)
    recommendation: Mapped[str] = mapped_column(String(64))
    criterion_scores: Mapped[list] = mapped_column(JSON, default=list)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    citation_valid_ratio: Mapped[float | None] = mapped_column(Float, nullable=True)
    confidence_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    candidate: Mapped["Candidate"] = relationship(back_populates="screenings")
    job: Mapped["JobRequisition | None"] = relationship(back_populates="screenings")



class AuditLog(Base):
    __tablename__ = "audit_logs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(128))
    entity_type: Mapped[str] = mapped_column(String(64))
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)


class JobStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    done = "done"
    failed = "failed"


class BackgroundJob(Base):
    """A simple DB-backed job queue -- no Redis/Celery required. The worker
    process (app/jobs/worker.py) polls for pending rows."""
    __tablename__ = "background_jobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    job_type: Mapped[str] = mapped_column(String(64))  # e.g. "ingest_github"
    payload: Mapped[dict] = mapped_column(JSON, default=dict)
    status: Mapped[JobStatus] = mapped_column(Enum(JobStatus), default=JobStatus.pending)
    result: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, onupdate=now)


class IntegrationSettings(Base):
    __tablename__ = "integration_settings"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True)
    encrypted_github_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    encrypted_anthropic_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    encrypted_openai_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, onupdate=now)


class Company(Base):
    """Demand side: Company entity record."""
    __tablename__ = "companies"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    domain: Mapped[str | None] = mapped_column(String(255), nullable=True)
    funding_stage: Mapped[str | None] = mapped_column(String(64), nullable=True)  # Series A, Series B, Series C, Series D, Seed, Bootstrapped
    headcount: Mapped[int | None] = mapped_column(Integer, nullable=True)
    growth_rate: Mapped[float | None] = mapped_column(Float, nullable=True)  # Growth percentage e.g. 25.0
    tier: Mapped[str | None] = mapped_column(String(16), nullable=True, default="B")  # S / A / B / C
    enrichment_payload: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    updated_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now, onupdate=now)

    opportunities: Mapped[list["Opportunity"]] = relationship(back_populates="company", cascade="all, delete-orphan")


class Opportunity(Base):
    """Demand side: Open role opportunity at a company."""
    __tablename__ = "opportunities"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company_id: Mapped[int] = mapped_column(ForeignKey("companies.id"))
    role_archetype: Mapped[str] = mapped_column(String(255))  # Agentic Engineer, Applied AI Engineer, etc.
    first_seen_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)
    days_open: Mapped[int] = mapped_column(Integer, default=0)
    urgency_band: Mapped[str | None] = mapped_column(String(64), nullable=True, default="Monitor")  # Monitor | Warming | Action now | Follow-up
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)

    company: Mapped["Company"] = relationship(back_populates="opportunities")


class Touch(Base):
    """Outreach event tracking channel, timestamp, outcome, and notes for candidates or companies."""
    __tablename__ = "touches"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    entity_type: Mapped[str] = mapped_column(String(32), index=True)  # candidate | company
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    channel: Mapped[str] = mapped_column(String(64))  # LinkedIn, Email, Call, Deck, In-Person
    outcome: Mapped[str] = mapped_column(String(128))  # Connected, Replied, Interested, No Response, Bounced, Converted
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=now)


