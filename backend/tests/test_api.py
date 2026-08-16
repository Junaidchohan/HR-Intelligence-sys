"""
End-to-end API tests covering the full pipeline:
ingestion -> normalization -> entity resolution -> evidence -> search ->
rubric -> screening -> citation validation, through the actual FastAPI app.

Requires the full dependency stack (see requirements.txt) which is NOT
installed in the build sandbox (no network egress there). Run these on a
machine with the deps installed:

    pip install -r requirements.txt
    GITHUB_OFFLINE_FIXTURES=true pytest tests/test_api.py -v

Uses a temporary SQLite file per test session and forces GitHub offline
fixture mode so this never depends on network access or live credentials.
"""
import os

os.environ["GITHUB_OFFLINE_FIXTURES"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_talent.db"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, engine
from app.main import app

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="module")
def auth_headers():
    client.post("/auth/register", json={"email": "recruiter@example.com", "password": "testpass123", "role": "recruiter"})
    resp = client.post("/auth/login", json={"email": "recruiter@example.com", "password": "testpass123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_health():
    res = client.get("/health").json()
    assert res["status"] == "ok"


def test_register_and_login(auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == "recruiter@example.com"


def test_register_duplicate_email():
    resp = client.post("/auth/register", json={"email": "recruiter@example.com", "password": "anotherpassword"})
    assert resp.status_code == 400
    assert "already registered" in resp.json()["detail"].lower()


def test_login_invalid_credentials():
    resp = client.post("/auth/login", json={"email": "recruiter@example.com", "password": "wrongpassword"})
    assert resp.status_code == 401
    assert "invalid" in resp.json()["detail"].lower()


def test_ingest_github_candidate(auth_headers):
    resp = client.post("/candidates/ingest", json={"source": "github", "identifier": "octocat"}, headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_new"] is True
    assert data["evidence_count"] >= 1


def test_ingest_is_idempotent(auth_headers):
    first = client.post("/candidates/ingest", json={"source": "github", "identifier": "janedoe"}, headers=auth_headers).json()
    second = client.post("/candidates/ingest", json={"source": "github", "identifier": "janedoe"}, headers=auth_headers).json()
    assert first["candidate_id"] == second["candidate_id"]
    assert second["is_new"] is False


def test_candidate_detail_has_evidence(auth_headers):
    ingest = client.post("/candidates/ingest", json={"source": "github", "identifier": "octocat"}, headers=auth_headers).json()
    detail = client.get(f"/candidates/{ingest['candidate_id']}", headers=auth_headers).json()
    assert len(detail["evidence"]) >= 1
    assert "python" in detail["skills"]


def test_search_by_skill(auth_headers):
    resp = client.get("/candidates/search", params={"q": "kubernetes"}, headers=auth_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1


def test_rubric_job_and_screening_flow(auth_headers):
    rubric_payload = {
        "name": "Backend Engineer",
        "criteria": [
            {"name": "Core Language", "weight": 0.6, "required_skills": ["python", "go"], "min_evidence_count": 1},
            {"name": "Infra", "weight": 0.4, "required_skills": ["kubernetes", "docker"], "min_evidence_count": 1},
        ],
    }
    rubric = client.post("/rubrics", json=rubric_payload, headers=auth_headers).json()

    job = client.post(
        "/job-requisitions",
        json={"title": "Senior Backend Engineer", "description": "...", "rubric_id": rubric["id"]},
        headers=auth_headers,
    ).json()

    ingest = client.post("/candidates/ingest", json={"source": "github", "identifier": "octocat"}, headers=auth_headers).json()

    screening = client.post(
        "/screenings", json={"candidate_id": ingest["candidate_id"], "job_id": job["id"]}, headers=auth_headers
    ).json()

    assert screening["overall_score"] > 0
    assert screening["recommendation"] in {"strong_match", "possible_match", "weak_match", "not_a_match"}
    assert 0.0 <= screening["citation_valid_ratio"] <= 1.0


def test_rubric_rejects_bad_weights(auth_headers):
    bad = {"name": "Bad", "criteria": [{"name": "A", "weight": 0.2}, {"name": "B", "weight": 0.2}]}
    resp = client.post("/rubrics", json=bad, headers=auth_headers)
    assert resp.status_code == 400


def test_unauthenticated_request_rejected():
    resp = client.get("/candidates")
    assert resp.status_code == 401
