import requests
import sys

BASE_URL = "http://localhost:8000"

def get_token():
    resp = requests.post(f"{BASE_URL}/auth/login", json={"email": "admin@example.com", "password": "admin"})
    resp.raise_for_status()
    return resp.json()["access_token"]

def test_ingestion(source, identifier, token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"source": source, "identifier": identifier}
    resp = requests.post(f"{BASE_URL}/candidates/ingest", json=payload, headers=headers)
    print(f"[{source}:{identifier}] Status: {resp.status_code}")
    print(resp.text)
    return resp

if __name__ == "__main__":
    token = get_token()
    print(f"Got token: {token[:10]}...")
    
    print("\n--- Testing 401 Fallback (Valid fixture) ---")
    test_ingestion("github", "torvalds", token)
    
    print("\n--- Testing 401 Fallback (Invalid User) ---")
    test_ingestion("github", "not_a_real_user_1234567890", token)
