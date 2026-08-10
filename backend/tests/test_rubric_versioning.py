from __future__ import annotations

import os

os.environ["GITHUB_OFFLINE_FIXTURES"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_talent.db"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.models import Candidate, JobRequisition, Rubric as RubricModel, Screening
from app.main import app


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client):
    reg = client.post("/auth/register", json={"email": "rubricuser@example.com", "password": "pass1234password"})
    if reg.status_code == 200:
        token = reg.json()["access_token"]
    else:
        login = client.post("/auth/login", json={"email": "rubricuser@example.com", "password": "pass1234password"})
        token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_immutable_rubric_versioning(client, auth_headers):
    # 1. Create v1 rubric
    payload = {
        "name": "Backend Architect",
        "criteria": [
            {
                "name": "Python",
                "weight": 0.5,
                "required_skills": ["python"],
                "min_evidence_count": 1,
                "description": "Python mastery",
            },
            {
                "name": "FastAPI",
                "weight": 0.5,
                "required_skills": ["fastapi"],
                "min_evidence_count": 1,
                "description": "FastAPI mastery",
            },
        ],
    }
    res = client.post("/rubrics", json=payload, headers=auth_headers)
    assert res.status_code == 200
    v1_rubric = res.json()
    assert v1_rubric["version"] == 1
    assert v1_rubric["parent_rubric_id"] is None
    v1_id = v1_rubric["id"]

    # 2. Create Job linking to v1 rubric
    j_res = client.post(
        "/job-requisitions",
        json={"title": "Lead Backend Architect", "rubric_id": v1_id},
        headers=auth_headers,
    )
    assert j_res.status_code == 200
    job_id = j_res.json()["id"]

    # 3. Update rubric (edit) -> should create v2 row
    update_payload = {
        "name": "Backend Architect V2",
        "criteria": [
            {
                "name": "Python & Async",
                "weight": 1.0,
                "required_skills": ["python", "asyncio"],
                "min_evidence_count": 1,
                "description": "Advanced Python",
            }
        ],
    }
    u_res = client.put(f"/rubrics/{v1_id}", json=update_payload, headers=auth_headers)
    assert u_res.status_code == 200
    v2_rubric = u_res.json()

    assert v2_rubric["id"] != v1_id  # New database row created!
    assert v2_rubric["version"] == 2
    assert v2_rubric["parent_rubric_id"] == v1_id

    # 4. Check that old v1 rubric is still intact in DB
    db = SessionLocal()
    old_row = db.get(RubricModel, v1_id)
    assert old_row is not None
    assert old_row.version == 1
    assert old_row.name == "Backend Architect"  # Unmutated!

    # 5. Check that active job was re-linked to v2_rubric.id
    job_row = db.get(JobRequisition, job_id)
    assert job_row.rubric_id == v2_rubric["id"]
    db.close()
