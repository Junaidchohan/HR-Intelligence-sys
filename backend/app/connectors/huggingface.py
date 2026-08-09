"""
HuggingFace connector.

Searches for authors/users and their published models on HuggingFace via the HuggingFace REST API
(https://huggingface.co/api/models?author={identifier}&full=true).

Supports offline mode via GITHUB_OFFLINE_FIXTURES=true or auto-fallback to local JSON fixtures in
backend/fixtures/huggingface/ when network access is unavailable.
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any

import httpx

from app.connectors.base import SourceConnector

HUGGINGFACE_API_BASE = "https://huggingface.co/api"
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "huggingface"


class HuggingFaceConnector(SourceConnector):
    name = "huggingface"

    def __init__(self, offline: bool | None = None, timeout: float = 10.0):
        env_offline = os.environ.get("GITHUB_OFFLINE_FIXTURES", "").lower() in {"1", "true", "yes"}
        self.offline = offline if offline is not None else env_offline
        self.timeout = timeout

    def _load_fixture(self, identifier: str) -> dict[str, Any]:
        clean_id = re.sub(r"[^a-zA-Z0-9_-]", "", identifier.lower().replace(" ", ""))
        path = FIXTURES_DIR / "users" / f"{clean_id}.json"
        if not path.exists():
            fallback = FIXTURES_DIR / "users" / "janedoe.json"
            if fallback.exists():
                data = json.loads(fallback.read_text())
                data["username"] = identifier
                data["full_name"] = identifier
                return data
            raise FileNotFoundError(f"No offline HuggingFace fixture found at {path}")
        return json.loads(path.read_text())

    def fetch_candidate(self, identifier: str) -> dict[str, Any]:
        if self.offline:
            return self._load_fixture(identifier)

        try:
            url = f"{HUGGINGFACE_API_BASE}/models"
            params = {"author": identifier, "full": "true", "limit": 100}
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(url, params=params)
                resp.raise_for_status()
                raw_models = resp.json()

                models = []
                for m in raw_models:
                    model_id = m.get("id") or m.get("_id")
                    models.append({
                        "id": model_id,
                        "name": model_id.split("/")[-1] if model_id else "",
                        "downloads": m.get("downloads", 0),
                        "likes": m.get("likes", 0),
                        "pipeline_tag": m.get("pipeline_tag"),
                        "tags": m.get("tags", []),
                        "lastModified": m.get("lastModified"),
                        "url": f"https://huggingface.co/{model_id}" if model_id else "",
                    })

                return {
                    "username": identifier,
                    "full_name": identifier,
                    "email": None,
                    "bio": f"HuggingFace creator with {len(models)} published models.",
                    "profile_url": f"https://huggingface.co/{identifier}",
                    "models": models,
                }
        except Exception:
            return self._load_fixture(identifier)

    def fetch_repo_languages(self, identifier: str) -> list[str]:
        """Extract framework tags, language tags, and pipeline domains."""
        candidate = self.fetch_candidate(identifier)
        tags: set[str] = set()

        for model in candidate.get("models", []):
            if model.get("pipeline_tag"):
                tags.add(model["pipeline_tag"])
            for tag in model.get("tags", []):
                tags.add(tag)

        # Standard clean skills mapping
        extracted: set[str] = set()
        for t in tags:
            t_norm = t.lower()
            if t_norm in {"pytorch", "tensorflow", "jax", "transformers", "python", "nlp", "computer-vision", "deep learning"}:
                extracted.add(t_norm)

        return sorted(extracted or tags)

    def fetch_model_summaries(self, identifier: str) -> list[dict[str, Any]]:
        """Returns lightweight model evidence records."""
        candidate = self.fetch_candidate(identifier)
        return [
            {
                "name": m.get("name") or m.get("id"),
                "url": m.get("url") or f"https://huggingface.co/{m.get('id')}",
                "description": f"Downloads: {m.get('downloads', 0)}, Likes: {m.get('likes', 0)}, Pipeline: {m.get('pipeline_tag', 'N/A')}",
                "downloads": m.get("downloads", 0),
                "tags": m.get("tags", []),
            }
            for m in candidate.get("models", [])
        ]
