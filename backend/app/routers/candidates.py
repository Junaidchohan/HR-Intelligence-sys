from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db import get_db
from app.evidence.service import list_evidence_for_candidate
from app.models import Candidate, User
from app.schemas import CandidateDetailOut, CandidateOut, EvidenceOut, IngestRequest, IngestResult, SearchResult
from app.search.search import search_candidates
from app.services.ingestion import (
    ingest_github_candidate,
    ingest_arxiv_candidate,
    ingest_conference_candidate,
    ingest_huggingface_candidate,
)

INGEST_HANDLERS = {
    "github": ingest_github_candidate,
    "arxiv": ingest_arxiv_candidate,
    "conference": ingest_conference_candidate,
    "huggingface": ingest_huggingface_candidate,
}

router = APIRouter(prefix="/candidates", tags=["candidates"])


@router.post("/ingest", response_model=IngestResult)
def ingest(payload: IngestRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    handler = INGEST_HANDLERS.get(payload.source)
    if not handler:
        supported = ", ".join(sorted(INGEST_HANDLERS.keys()))
        raise HTTPException(
            status_code=400,
            detail=f"Unknown source '{payload.source}'. Supported sources: {supported}",
        )
    try:
        result = handler(db, payload.identifier, user_id=user.id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail=f"User '{payload.identifier}' offline fixture not found: {str(exc)}") from exc
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code == 404:
            raise HTTPException(status_code=404, detail=f"User '{payload.identifier}' not found on GitHub") from exc
        raise HTTPException(
            status_code=exc.response.status_code,
            detail=f"GitHub API error: {exc.response.text or str(exc)}"
        ) from exc
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to connect to GitHub API: {str(exc)}"
        ) from exc
    return IngestResult(**result, message="Ingestion started")


@router.get("", response_model=list[CandidateOut])
def list_candidates(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Candidate).order_by(Candidate.created_at.desc()).all()


@router.get("/search", response_model=list[SearchResult])
def search(q: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    results = search_candidates(db, q)
    return [SearchResult(candidate=c, match_reason=reason) for c, reason in results]


@router.get("/search-github/{username}")
def search_github_user(username: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    username = username.strip()
    print(f"Attempting to fetch GitHub profile for: {username}")
    
    from app.connectors.github import GitHubConnector
    connector = GitHubConnector(db=db, user_id=user.id)
    
    try:
        return connector.fetch_candidate(username)
    except httpx.HTTPStatusError as exc:
        status_code = exc.response.status_code
        if status_code == 403:
            raise HTTPException(status_code=403, detail="GitHub API rate limit reached. Please wait or add a GitHub Token.")
        elif status_code == 404:
            raise HTTPException(status_code=404, detail="User not found on GitHub")
        else:
            raise HTTPException(status_code=status_code, detail=f"GitHub API error: {exc.response.text}")
    except httpx.RequestError as exc:
        raise HTTPException(status_code=502, detail=f"Failed to connect to GitHub API: {str(exc)}") from exc


@router.get("/{candidate_id}", response_model=CandidateDetailOut)
def get_candidate(candidate_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    evidence = list_evidence_for_candidate(db, candidate_id)
    identities = [
        {"source": i.source, "username": i.username, "resolution_reason": i.resolution_reason, "resolution_confidence": i.resolution_confidence}
        for i in candidate.identities
    ]
    return CandidateDetailOut(
        id=candidate.id,
        full_name=candidate.full_name,
        primary_email=candidate.primary_email,
        location=candidate.location,
        bio=candidate.bio,
        skills=candidate.skills or [],
        created_at=candidate.created_at,
        updated_at=candidate.updated_at,
        evidence=[EvidenceOut.model_validate(e) for e in evidence],
        identities=identities,
    )


@router.delete("/{candidate_id}", status_code=204)
def delete_candidate(candidate_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    candidate = db.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    db.delete(candidate)
    db.commit()
    return


