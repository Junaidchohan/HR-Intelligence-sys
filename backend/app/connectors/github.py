"""
GitHub connector.

REAL integration: calls the live GitHub REST API (https://api.github.com)
using an optional personal access token (env var GITHUB_TOKEN). Without a
token GitHub's API still works but is rate-limited to 60 req/hour per IP.

Offline mode: if GITHUB_OFFLINE_FIXTURES=true (or no token AND no network
is reachable), falls back to local JSON fixtures in backend/fixtures/github/
so ingestion, normalization, and the rest of the pipeline can be developed
and tested without live network access. This is the mode this project ships
in for the sandboxed test run in this repo -- see FINAL_STATUS.md.

Required environment variable for live use: GITHUB_TOKEN
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import httpx

from app.connectors.base import SourceConnector

GITHUB_API_BASE = "https://api.github.com"
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "github"


class GitHubConnector(SourceConnector):
    name = "github"

    def __init__(self, token: str | None = None, offline: bool | None = None, timeout: float = 10.0, db = None, user_id: int | None = None):
        self.token = token
        self.db = db
        self.user_id = user_id
        env_offline_str = os.environ.get("GITHUB_OFFLINE_FIXTURES", "").lower()
        if env_offline_str in {"1", "true", "yes"}:
            env_offline = True
        elif env_offline_str in {"0", "false", "no"}:
            env_offline = False
        else:
            env_offline = not bool(self.get_token())
        self.offline = offline if offline is not None else env_offline
        self.timeout = timeout

    def get_token(self) -> str | None:
        if self.token:
            return self.token
        if self.db and self.user_id:
            from app.models import IntegrationSettings
            from app.core.encryption import decrypt_token
            settings = self.db.query(IntegrationSettings).filter(IntegrationSettings.user_id == self.user_id).first()
            if settings and settings.encrypted_github_token:
                decrypted = decrypt_token(settings.encrypted_github_token)
                if decrypted:
                    return decrypted
        return os.environ.get("GITHUB_TOKEN")

    def _headers(self) -> dict[str, str]:
        headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
        tok = self.get_token()
        if tok:
            headers["Authorization"] = f"Bearer {tok}"
        return headers

    def _load_fixture(self, kind: str, identifier: str) -> Any:
        path = FIXTURES_DIR / kind / f"{identifier}.json"
        if not path.exists():
            raise FileNotFoundError(
                f"No offline fixture at {path}. Add one, or set GITHUB_TOKEN and "
                f"GITHUB_OFFLINE_FIXTURES=false to hit the live API."
            )
        return json.loads(path.read_text())

    def fetch_candidate(self, identifier: str) -> dict[str, Any]:
        clean_username = identifier.strip().replace(" ", "-")
        if self.offline:
            try:
                return self._load_fixture("users", clean_username)
            except FileNotFoundError:
                pass
        with httpx.Client(base_url=GITHUB_API_BASE, headers=self._headers(), timeout=10, verify=False) as client:
            resp = client.get(f"/users/{clean_username}")
            resp.raise_for_status()
            return resp.json()

    def fetch_repo_languages(self, identifier: str) -> list[str]:
        clean_username = identifier.strip().replace(" ", "-")
        if self.offline:
            try:
                data = self._load_fixture("repos", clean_username)
                return sorted({repo.get("language") for repo in data if repo.get("language")})
            except FileNotFoundError:
                pass
        try:
            with httpx.Client(base_url=GITHUB_API_BASE, headers=self._headers(), timeout=10, verify=False) as client:
                resp = client.get(f"/users/{clean_username}/repos", params={"per_page": 100, "sort": "updated"})
                if resp.status_code == 404:
                    return []
                resp.raise_for_status()
                repos = resp.json()
                return sorted({repo.get("language") for repo in repos if repo.get("language")})
        except Exception as e:
            print(f"Network error in fetch_repo_languages: {e}")
            return []

    def fetch_repo_summaries(self, identifier: str) -> list[dict[str, Any]]:
        """Returns lightweight repo evidence records: name, url, description,
        stars, language."""
        clean_username = identifier.strip().replace(" ", "-")
        if self.offline:
            try:
                data = self._load_fixture("repos", clean_username)
            except FileNotFoundError:
                data = []
        else:
            try:
                with httpx.Client(base_url=GITHUB_API_BASE, headers=self._headers(), timeout=10, verify=False) as client:
                    resp = client.get(f"/users/{clean_username}/repos", params={"per_page": 100, "sort": "updated"})
                    if resp.status_code == 404:
                        data = []
                    else:
                        resp.raise_for_status()
                        data = resp.json()
            except Exception as e:
                print(f"Network error in fetch_repo_summaries: {e}")
                data = []
        return [
            {
                "name": r.get("name"),
                "url": r.get("html_url"),
                "description": r.get("description"),
                "stars": r.get("stargazers_count", 0),
                "language": r.get("language"),
            }
            for r in data
        ]
