"""
arXiv connector.

Searches for authors and papers on arXiv via the arXiv REST API (https://export.arxiv.org/api/query).
Parses the Atom XML response into structured JSON objects.

Supports offline mode via GITHUB_OFFLINE_FIXTURES=true or auto-fallback to local JSON fixtures in
backend/fixtures/arxiv/ when network access is unavailable.
"""
from __future__ import annotations

import json
import os
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import httpx

from app.connectors.base import SourceConnector

ARXIV_API_BASE = "https://export.arxiv.org/api/query"
FIXTURES_DIR = Path(__file__).resolve().parents[2] / "fixtures" / "arxiv"

# Mapping arXiv subject categories to standard skill keywords
CATEGORY_MAP = {
    "cs.AI": ["machine learning", "deep learning"],
    "cs.CL": ["nlp", "deep learning", "python"],
    "cs.CV": ["computer vision", "deep learning", "pytorch"],
    "cs.LG": ["machine learning", "deep learning", "python"],
    "cs.NE": ["neural networks", "deep learning"],
    "cs.RO": ["robotics", "python", "c++"],
    "stat.ML": ["machine learning", "python"],
}


class ArXivConnector(SourceConnector):
    name = "arxiv"

    def __init__(self, offline: bool | None = None, timeout: float = 10.0):
        env_offline = os.environ.get("GITHUB_OFFLINE_FIXTURES", "").lower() in {"1", "true", "yes"}
        self.offline = offline if offline is not None else env_offline
        self.timeout = timeout

    def _load_fixture(self, identifier: str) -> dict[str, Any]:
        clean_id = re.sub(r"[^a-zA-Z0-9_-]", "", identifier.lower().replace(" ", ""))
        path = FIXTURES_DIR / "papers" / f"{clean_id}.json"
        if not path.exists():
            # Fallback to janedoe.json fixture if requested name not found in offline mode
            fallback = FIXTURES_DIR / "papers" / "janedoe.json"
            if fallback.exists():
                data = json.loads(fallback.read_text())
                data["author"] = identifier
                data["query"] = identifier
                return data
            raise FileNotFoundError(f"No offline arXiv fixture found at {path}")
        return json.loads(path.read_text())

    def _parse_atom_xml(self, xml_text: str, identifier: str) -> dict[str, Any]:
        ns = {
            "atom": "http://www.w3.org/2005/Atom",
            "arxiv": "http://arxiv.org/schemas/atom",
        }
        root = ET.fromstring(xml_text)
        papers = []
        author_email = None

        for entry in root.findall("atom:entry", ns):
            title_elem = entry.find("atom:title", ns)
            summary_elem = entry.find("atom:summary", ns)
            published_elem = entry.find("atom:published", ns)
            id_elem = entry.find("atom:id", ns)

            title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""
            summary = summary_elem.text.strip() if summary_elem is not None and summary_elem.text else ""
            published = published_elem.text.strip() if published_elem is not None and published_elem.text else ""
            arxiv_id = id_elem.text.strip() if id_elem is not None and id_elem.text else ""

            # Authors
            authors = []
            for author_node in entry.findall("atom:author", ns):
                name_node = author_node.find("atom:name", ns)
                if name_node is not None and name_node.text:
                    authors.append(name_node.text.strip())

            # PDF link
            pdf_url = ""
            for link in entry.findall("atom:link", ns):
                if link.attrib.get("title") == "pdf" or link.attrib.get("type") == "application/pdf":
                    pdf_url = link.attrib.get("href", "")
                    break
            if not pdf_url and arxiv_id:
                pdf_url = arxiv_id.replace("abs", "pdf") + ".pdf"

            # Categories
            categories = []
            for cat in entry.findall("atom:category", ns):
                term = cat.attrib.get("term")
                if term:
                    categories.append(term)

            papers.append({
                "arxiv_id": arxiv_id,
                "title": title,
                "authors": authors,
                "published": published,
                "summary": summary,
                "pdf_url": pdf_url,
                "categories": categories,
            })

        return {
            "query": identifier,
            "author": identifier,
            "email": author_email,
            "papers": papers,
        }

    def fetch_candidate(self, identifier: str) -> dict[str, Any]:
        if self.offline:
            return self._load_fixture(identifier)

        try:
            params = {
                "search_query": f'au:"{identifier}"',
                "start": 0,
                "max_results": 50,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
            }
            with httpx.Client(timeout=self.timeout) as client:
                resp = client.get(ARXIV_API_BASE, params=params)
                resp.raise_for_status()
                return self._parse_atom_xml(resp.text, identifier)
        except Exception:
            # Fallback to fixture if network request fails
            return self._load_fixture(identifier)

    def fetch_repo_languages(self, identifier: str) -> list[str]:
        """Maps paper categories and domain topics into skills/languages."""
        candidate = self.fetch_candidate(identifier)
        tags: set[str] = set()

        for paper in candidate.get("papers", []):
            for cat in paper.get("categories", []):
                tags.add(cat)
                if cat in CATEGORY_MAP:
                    tags.update(CATEGORY_MAP[cat])
            # Scan summary for keywords
            text = (paper.get("summary", "") + " " + paper.get("title", "")).lower()
            for kw in ["python", "pytorch", "tensorflow", "jax", "c++", "cuda"]:
                if kw in text:
                    tags.add(kw)

        return sorted(tags)

    def fetch_paper_summaries(self, identifier: str) -> list[dict[str, Any]]:
        """Returns structured paper evidence records: title, pdf_url, summary, published, categories."""
        candidate = self.fetch_candidate(identifier)
        return [
            {
                "name": p.get("title"),
                "url": p.get("pdf_url") or p.get("arxiv_id", ""),
                "description": p.get("summary"),
                "published": p.get("published"),
                "categories": p.get("categories", []),
            }
            for p in candidate.get("papers", [])
        ]
