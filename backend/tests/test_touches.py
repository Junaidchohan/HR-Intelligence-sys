from __future__ import annotations

import os

os.environ["GITHUB_OFFLINE_FIXTURES"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_talent.db"

import pytest
from fastapi.testclient import TestClient

from app.db import Base, SessionLocal, engine
from app.models import Candidate, Company
from app.main import app


@pytest.fixture(scope="module")
def client():
    Base.metadata.create_all(bind=engine)
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="module")
def auth_headers(client):
    reg = client.post("/auth/register", json={"email": "touchuser@example.com", "password": "pass1234password"})
    if reg.status_code == 200:
        token = reg.json()["access_token"]
    else:
        login = client.post("/auth/login", json={"email": "touchuser@example.com", "password": "pass1234password"})
        token = login.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_touches_crud_flow(client, auth_headers):
    db = SessionLocal()
    cand = Candidate(full_name="Jane Touch", primary_email="jane@example.com", skills=["Python", "FastAPI"])
    db.add(cand)
    comp = Company(name="Touch Enterprise", tier="S")
    db.add(comp)
    db.commit()
    candidate_id = cand.id
    company_id = comp.id
    db.close()

    # 1. Create a Touch for the candidate
    res = client.post(
        "/touches",
        json={
            "entity_type": "candidate",
            "entity_id": candidate_id,
            "channel": "LinkedIn",
            "outcome": "Connected",
            "notes": "Sent custom outreach deck",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    touch_data = res.json()
    assert touch_data["entity_type"] == "candidate"
    assert touch_data["entity_id"] == candidate_id
    assert touch_data["channel"] == "LinkedIn"
    assert touch_data["outcome"] == "Connected"
    assert touch_data["notes"] == "Sent custom outreach deck"
    touch_id = touch_data["id"]

    # 2. List touches filtered by candidate
    res = client.get(f"/touches?entity_type=candidate&entity_id={candidate_id}", headers=auth_headers)
    assert res.status_code == 200
    touches_list = res.json()
    assert len(touches_list) >= 1
    assert touches_list[0]["id"] == touch_id

    # 3. Get single touch
    res = client.get(f"/touches/{touch_id}", headers=auth_headers)
    assert res.status_code == 200
    assert res.json()["id"] == touch_id

    # 4. Create Touch for the company
    res = client.post(
        "/touches",
        json={
            "entity_type": "company",
            "entity_id": company_id,
            "channel": "Call",
            "outcome": "Interested",
            "notes": "Spoke with VP of Eng",
        },
        headers=auth_headers,
    )
    assert res.status_code == 200
    comp_touch_id = res.json()["id"]

    # 5. Delete touch
    res = client.delete(f"/touches/{touch_id}", headers=auth_headers)
    assert res.status_code == 204

    # Verification: should be gone
    res = client.get(f"/touches/{touch_id}", headers=auth_headers)
    assert res.status_code == 404
