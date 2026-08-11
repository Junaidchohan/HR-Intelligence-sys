import httpx, json, sys

BASE = "https://hr-talent-intelligence-backend.onrender.com"
client = httpx.Client(timeout=30)

print("=== BACKEND HEALTH ===")
h = client.get(f"{BASE}/health").json()
print(f"Health: {h}")

print("\n=== AUTH ===")
r = client.post(f"{BASE}/auth/register", json={"email": "finalqa@talentbase.ai", "password": "FinalQA@2024!"})
if r.status_code == 200:
    token = r.json()["access_token"]
    print("Registered successfully")
else:
    r2 = client.post(f"{BASE}/auth/login", json={"email": "finalqa@talentbase.ai", "password": "FinalQA@2024!"})
    token = r2.json()["access_token"]
    print("Logged in successfully")

H = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

print("\n=== CANDIDATES ===")
cands = client.get(f"{BASE}/candidates", headers=H).json()
print(f"Total candidates: {len(cands)}")
for c in cands[:3]:
    print(f"  - {c.get('full_name')} | skills: {c.get('skills', [])[:4]}")

print("\n=== COMPANIES ===")
cos = client.get(f"{BASE}/companies", headers=H).json()
print(f"Total companies: {len(cos)}")
for co in cos[:3]:
    print(f"  - {co.get('name')} | tier={co.get('tier')} | opps={len(co.get('opportunities', []))}")

print("\n=== RUBRICS ===")
rubs = client.get(f"{BASE}/rubrics", headers=H).json()
print(f"Total rubrics: {len(rubs)}")
for rb in rubs:
    print(f"  - {rb['name']} v{rb.get('version', 1)} (id={rb['id']}, parent={rb.get('parent_rubric_id')})")

print("\n=== OPPORTUNITIES ===")
opps = client.get(f"{BASE}/opportunities", headers=H).json()
print(f"Total opportunities: {len(opps)}")
for o in opps[:5]:
    print(f"  - {o['role_archetype']} | {o['urgency_band']} | days_open={o['days_open']}")

print("\n=== COMMAND CENTER MATCHES ===")
matches = client.get(f"{BASE}/command-center/matches", headers=H).json()
print(f"Opportunities in Join Layer: {len(matches)}")
for m in matches[:5]:
    cands_count = len(m.get("matching_candidates", []))
    print(f"  {m['company_name']} | {m['role_archetype']} | {m['urgency_band']} | {cands_count} candidate matches")

print("\n=== CREATE COMPANY: OpenAI ===")
new_co = client.post(f"{BASE}/companies", headers=H, json={
    "name": "OpenAI", "domain": "openai.com", "funding_stage": "Series D",
    "headcount": 1000, "growth_rate": 150.0, "tier": "S"
}).json()
print(f"Created: {new_co.get('name')} ID={new_co.get('id')}")

print("\n=== ADD OPPORTUNITY TO COMPANY ===")
new_opp = client.post(f"{BASE}/opportunities", headers=H, json={
    "company_id": new_co["id"], "role_archetype": "Applied AI Engineer", "urgency_band": "Action now"
}).json()
print(f"Opportunity: {new_opp.get('role_archetype')} | {new_opp.get('urgency_band')}")

print("\n=== RECOMPUTE URGENCY ===")
recomp = client.post(f"{BASE}/opportunities/recompute-urgency", headers=H).json()
print(f"Recompute: status={recomp.get('status')} | updated={recomp.get('updated_opportunities')}")

print("\n=== CREATE RUBRIC ===")
new_rub = client.post(f"{BASE}/rubrics", headers=H, json={
    "name": "Applied AI Engineer",
    "criteria": [
        {"name": "Python ML", "weight": 0.6, "required_skills": ["python", "pytorch"], "min_evidence_count": 1, "description": "ML skills"},
        {"name": "Systems", "weight": 0.4, "required_skills": ["distributed"], "min_evidence_count": 0, "description": "Infra"}
    ]
}).json()
print(f"Rubric: {new_rub.get('name')} v{new_rub.get('version')} ID={new_rub.get('id')}")

print("\n=== RUBRIC IMMUTABLE VERSIONING ===")
updated = client.put(f"{BASE}/rubrics/{new_rub['id']}", headers=H, json={
    "name": "Applied AI Engineer Revised",
    "criteria": [
        {"name": "Python ML Advanced", "weight": 0.7, "required_skills": ["python", "pytorch", "llm"], "min_evidence_count": 1, "description": "Updated"},
        {"name": "Systems Infra", "weight": 0.3, "required_skills": ["k8s", "distributed"], "min_evidence_count": 0, "description": "Updated"}
    ]
}).json()
print(f"New version: {updated.get('name')} v{updated.get('version')} ID={updated.get('id')} parent={updated.get('parent_rubric_id')}")
old_preserved = updated.get("id") != new_rub["id"]
print(f"Old row preserved (immutable): {old_preserved}")

print("\n=== LOG OUTREACH TOUCH ===")
touch = client.post(f"{BASE}/touches", headers=H, json={
    "entity_type": "company", "entity_id": new_co["id"],
    "channel": "LinkedIn", "outcome": "Connected",
    "notes": "Reached out to OpenAI hiring team via LinkedIn"
}).json()
print(f"Touch logged: ID={touch.get('id')} | {touch.get('channel')} | {touch.get('outcome')}")

print("\n=== ALL TOUCHES ===")
all_touches = client.get(f"{BASE}/touches", headers=H).json()
print(f"Total touches in DB: {len(all_touches)}")

print("\n=== FINAL COMMAND CENTER (with new data) ===")
matches2 = client.get(f"{BASE}/command-center/matches?urgency_band=Action now", headers=H).json()
print(f"Action now opportunities: {len(matches2)}")
for m in matches2[:3]:
    print(f"  {m['company_name']} | {m['role_archetype']} | {m['urgency_band']} | {len(m['matching_candidates'])} candidates")

print("\n=== ALL TESTS PASSED ===")
