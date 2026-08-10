from __future__ import annotations

import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: int
    email: str
    role: str
    created_at: Optional[datetime.datetime] = None
    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "recruiter"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class IngestRequest(BaseModel):
    source: str = "github"
    identifier: str  # e.g. github username


class EvidenceOut(BaseModel):
    id: int
    source: str
    evidence_type: str
    title: Optional[str]
    url: str
    snippet: Optional[str]
    collected_at: datetime.datetime
    model_config = {"from_attributes": True}


class CandidateOut(BaseModel):
    id: int
    full_name: Optional[str]
    primary_email: Optional[str]
    location: Optional[str]
    bio: Optional[str]
    skills: list[str]
    created_at: datetime.datetime
    updated_at: datetime.datetime
    model_config = {"from_attributes": True}


class CandidateDetailOut(CandidateOut):
    evidence: list[EvidenceOut] = []
    identities: list[dict[str, Any]] = []


class IngestResult(BaseModel):
    candidate_id: int
    is_new: bool
    resolution_reason: str
    resolution_confidence: float
    evidence_count: int
    message: str = "Ingestion started"


class RubricCriterionIn(BaseModel):
    name: str
    weight: float
    required_skills: list[str] = []
    min_evidence_count: int = 0
    description: str = ""


class RubricCreate(BaseModel):
    name: str
    criteria: list[RubricCriterionIn]


class RubricOut(BaseModel):
    id: int
    name: str
    version: int = 1
    parent_rubric_id: Optional[int] = None
    criteria: list[dict[str, Any]]
    model_config = {"from_attributes": True}


class JobCreate(BaseModel):
    title: str
    description: Optional[str] = None
    rubric_id: int
    client_name: Optional[str] = None
    priority: Optional[str] = "Medium"  # High | Medium | Low


class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    rubric_id: Optional[int] = None
    client_name: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None  # active | filled


class JobOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    rubric_id: int
    client_name: Optional[str] = None
    priority: Optional[str] = None
    status: str = "active"
    model_config = {"from_attributes": True}


class LeaderboardEntry(BaseModel):
    rank: int
    candidate_id: int
    candidate_name: Optional[str]
    location: Optional[str]
    overall_score: float
    recommendation: str
    job_id: Optional[int]
    model_config = {"from_attributes": True}


class ScreenRequest(BaseModel):
    candidate_id: int
    job_id: Optional[int] = None
    rubric_id: Optional[int] = None


class CriterionScoreOut(BaseModel):
    name: str
    weight: float
    raw_score: float
    weighted_score: float
    matched_skills: list[str]
    explanation: str


class ScreeningOut(BaseModel):
    id: int
    candidate_id: int
    job_id: Optional[int] = None
    rubric_id: Optional[int] = None
    overall_score: float
    recommendation: str
    criterion_scores: list[dict[str, Any]]
    summary: Optional[str]
    citation_valid_ratio: Optional[float]
    confidence_score: Optional[float] = None
    created_at: datetime.datetime
    model_config = {"from_attributes": True}


class SearchResult(BaseModel):
    candidate: CandidateOut
    match_reason: str


class IntegrationSettingsUpdate(BaseModel):
    github_token: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None


class IntegrationSettingsOut(BaseModel):
    github_token_configured: bool
    anthropic_api_key_configured: bool
    openai_api_key_configured: bool

class BatchScreenRequest(BaseModel):
    rubric_id: int
    usernames: list[str]


class OpportunityCreate(BaseModel):
    company_id: int
    role_archetype: str
    urgency_band: Optional[str] = "Monitor"


class OpportunityOut(BaseModel):
    id: int
    company_id: int
    role_archetype: str
    first_seen_at: datetime.datetime
    days_open: int = 0
    urgency_band: Optional[str] = "Monitor"
    created_at: datetime.datetime
    model_config = {"from_attributes": True}


class CompanyCreate(BaseModel):
    name: str
    domain: Optional[str] = None
    funding_stage: Optional[str] = "Series A"
    headcount: Optional[int] = None
    growth_rate: Optional[float] = None
    tier: Optional[str] = "B"


class CompanyOut(BaseModel):
    id: int
    name: str
    domain: Optional[str] = None
    funding_stage: Optional[str] = None
    headcount: Optional[int] = None
    growth_rate: Optional[float] = None
    tier: Optional[str] = "B"
    enrichment_payload: dict[str, Any] = {}
    created_at: datetime.datetime
    updated_at: datetime.datetime
    opportunities: list[OpportunityOut] = []
    model_config = {"from_attributes": True}


class TouchCreate(BaseModel):
    entity_type: str  # candidate | company
    entity_id: int
    channel: str  # LinkedIn | Email | Call | Deck | In-Person
    outcome: str  # Connected | Replied | Interested | No Response | Bounced | Converted
    notes: Optional[str] = None


class TouchOut(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    channel: str
    outcome: str
    notes: Optional[str] = None
    created_at: datetime.datetime
    model_config = {"from_attributes": True}

