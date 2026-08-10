import os
import pytest
from fastapi.testclient import TestClient

os.environ["GITHUB_OFFLINE_FIXTURES"] = "true"
os.environ["DATABASE_URL"] = "sqlite:///./test_talent.db"

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
def demand_auth_headers():
    client.post("/auth/register", json={"email": "demandadmin@example.com", "password": "testpass123", "role": "admin"})
    resp = client.post("/auth/login", json={"email": "demandadmin@example.com", "password": "testpass123"})
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_create_and_list_company(demand_auth_headers):
    # Create company
    res = client.post(
        "/companies",
        json={
            "name": "Acme AI Corp",
            "domain": "acme.ai",
            "funding_stage": "Series B",
            "headcount": 120,
            "growth_rate": 45.5,
            "tier": "S",
        },
        headers=demand_auth_headers,
    )
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["name"] == "Acme AI Corp"
    assert data["domain"] == "acme.ai"
    assert data["funding_stage"] == "Series B"
    assert data["headcount"] == 120
    assert data["growth_rate"] == 45.5
    assert data["tier"] == "S"
    company_id = data["id"]

    # List companies
    res_list = client.get("/companies", headers=demand_auth_headers)
    assert res_list.status_code == 200
    companies = res_list.json()
    assert len(companies) >= 1
    c_found = next((c for c in companies if c["id"] == company_id), None)
    assert c_found is not None


def test_create_opportunity_hardcodes_days_open(demand_auth_headers):
    # Create company
    c_res = client.post(
        "/companies",
        json={"name": "Anthropic AI", "domain": "anthropic.com", "funding_stage": "Series C", "tier": "S"},
        headers=demand_auth_headers,
    )
    company_id = c_res.json()["id"]

    # Create opportunity
    o_res = client.post(
        "/opportunities",
        json={
            "company_id": company_id,
            "role_archetype": "Agentic Engineer",
        },
        headers=demand_auth_headers,
    )
    assert o_res.status_code == 200, o_res.text
    opp = o_res.json()
    assert opp["company_id"] == company_id
    assert opp["role_archetype"] == "Agentic Engineer"
    assert opp["days_open"] == 0  # Hardcoded 0 on creation per spec
    assert opp["urgency_band"] == "Monitor"  # 0 days open -> Monitor

    # Get company and verify nested opportunity
    c_get = client.get(f"/companies/{company_id}", headers=demand_auth_headers)
    assert c_get.status_code == 200
    comp_data = c_get.json()
    assert len(comp_data["opportunities"]) >= 1
    assert any(o["id"] == opp["id"] for o in comp_data["opportunities"])
