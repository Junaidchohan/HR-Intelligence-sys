from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class SourceConnector(ABC):
    """Interface every ingestion connector implements. Real, network-backed
    connectors (GitHubConnector) and offline/fixture connectors both satisfy
    this so the ingestion pipeline never needs to know which it's talking
    to."""

    name: str

    @abstractmethod
    def fetch_candidate(self, identifier: str) -> dict[str, Any]:
        """Fetch a single raw candidate payload by source-specific identifier
        (e.g. a GitHub username)."""

    @abstractmethod
    def fetch_repo_languages(self, identifier: str) -> list[str]:
        """Fetch a list of languages/technologies associated with the
        candidate's public work, used to enrich skill extraction."""
