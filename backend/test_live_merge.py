#!/usr/bin/env python3
"""
Standalone test script to verify live query and entity resolution/merge
across GitHub, arXiv, and HuggingFace APIs.
"""
import os
import sys
import json

# Ensure we can import from the app directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Force live API connections by disabling fixtures
os.environ["GITHUB_OFFLINE_FIXTURES"] = "false"

from app.connectors.github import GitHubConnector
from app.connectors.arxiv import ArXivConnector
from app.connectors.huggingface import HuggingFaceConnector
from app.normalization.normalize import (
    normalize_github_user,
    normalize_arxiv_user,
    normalize_huggingface_user,
)
from app.entity_resolution.resolve import resolve_identity, CandidateRecord

def test_live_merge():
    # 1. Get input username
    if len(sys.argv) > 1:
        username = sys.argv[1]
    else:
        username = input("Enter GitHub username (e.g. 'octocat'): ").strip()
    
    if not username:
        print("Error: No username provided.", file=sys.stderr)
        sys.exit(1)

    print(f"Querying live APIs for: {username}...", file=sys.stderr)

    # 2. Search GitHub
    try:
        github_connector = GitHubConnector(offline=False)
        print("Fetching GitHub candidate details...", file=sys.stderr)
        raw_gh = github_connector.fetch_candidate(username)
        print("Fetching GitHub repository languages...", file=sys.stderr)
        langs_gh = github_connector.fetch_repo_languages(username)
        print("Normalizing GitHub identity...", file=sys.stderr)
        gh_identity = normalize_github_user(raw_gh, repo_languages=langs_gh)
    except Exception as e:
        print(f"Error fetching/normalizing GitHub user '{username}': {e}", file=sys.stderr)
        sys.exit(1)

    # Initialize the unified profile with GitHub as the primary/base identity
    unified_profile = {
        "full_name": gh_identity.full_name,
        "primary_email": gh_identity.primary_email,
        "location": gh_identity.location,
        "bio": gh_identity.bio,
        "skills": gh_identity.skills,
        "identities": [
            {
                "source": gh_identity.source,
                "username": gh_identity.username,
                "profile_url": gh_identity.profile_url
            }
        ],
        "github_repos": github_connector.fetch_repo_summaries(username),
        "arxiv_papers": [],
        "huggingface_models": []
    }

    # 3. Search arXiv
    try:
        arxiv_connector = ArXivConnector(offline=False)
        print("Fetching arXiv author details...", file=sys.stderr)
        raw_arxiv = arxiv_connector.fetch_candidate(username)
        
        # Only proceed if we actually found papers/contributions
        if raw_arxiv.get("papers"):
            langs_arxiv = arxiv_connector.fetch_repo_languages(username)
            arxiv_identity = normalize_arxiv_user(raw_arxiv, extra_skills=langs_arxiv)
            
            # Run entity resolution
            current_candidate = CandidateRecord(
                id=1,
                full_name=unified_profile["full_name"],
                primary_email=unified_profile["primary_email"],
                identities=[(ident["source"], ident["username"]) for ident in unified_profile["identities"]]
            )
            
            res = resolve_identity(arxiv_identity, [current_candidate])
            print(f"arXiv resolution: match={not res.is_new}, confidence={res.confidence}, reason={res.reason}", file=sys.stderr)
            
            if not res.is_new:
                # Merge profile details
                unified_profile["skills"] = sorted(set(unified_profile["skills"]) | set(arxiv_identity.skills))
                if not unified_profile["primary_email"]:
                    unified_profile["primary_email"] = arxiv_identity.primary_email
                if not unified_profile["full_name"]:
                    unified_profile["full_name"] = arxiv_identity.full_name
                
                unified_profile["identities"].append({
                    "source": arxiv_identity.source,
                    "username": arxiv_identity.username,
                    "profile_url": arxiv_identity.profile_url
                })
                unified_profile["arxiv_papers"] = arxiv_connector.fetch_paper_summaries(username)
        else:
            print("No papers found on arXiv for this user.", file=sys.stderr)
    except Exception as e:
        print(f"arXiv query skipped or failed: {e}", file=sys.stderr)

    # 4. Search HuggingFace
    try:
        hf_connector = HuggingFaceConnector(offline=False)
        print("Fetching HuggingFace user details...", file=sys.stderr)
        raw_hf = hf_connector.fetch_candidate(username)
        
        if raw_hf.get("models"):
            langs_hf = hf_connector.fetch_repo_languages(username)
            hf_identity = normalize_huggingface_user(raw_hf, extra_skills=langs_hf)
            
            # Run entity resolution
            current_candidate = CandidateRecord(
                id=1,
                full_name=unified_profile["full_name"],
                primary_email=unified_profile["primary_email"],
                identities=[(ident["source"], ident["username"]) for ident in unified_profile["identities"]]
            )
            
            res = resolve_identity(hf_identity, [current_candidate])
            print(f"HuggingFace resolution: match={not res.is_new}, confidence={res.confidence}, reason={res.reason}", file=sys.stderr)
            
            if not res.is_new:
                # Merge profile details
                unified_profile["skills"] = sorted(set(unified_profile["skills"]) | set(hf_identity.skills))
                if not unified_profile["primary_email"]:
                    unified_profile["primary_email"] = hf_identity.primary_email
                if not unified_profile["full_name"]:
                    unified_profile["full_name"] = hf_identity.full_name
                if not unified_profile["location"]:
                    unified_profile["location"] = hf_identity.location
                if hf_identity.bio and (not unified_profile["bio"] or len(hf_identity.bio) > len(unified_profile["bio"])):
                    unified_profile["bio"] = hf_identity.bio
                
                unified_profile["identities"].append({
                    "source": hf_identity.source,
                    "username": hf_identity.username,
                    "profile_url": hf_identity.profile_url
                })
                unified_profile["huggingface_models"] = hf_connector.fetch_model_summaries(username)
        else:
            print("No models found on HuggingFace for this user.", file=sys.stderr)
    except Exception as e:
        print(f"HuggingFace query skipped or failed: {e}", file=sys.stderr)

    # 5. Output unified JSON profile
    print("\n--- UNIFIED CANONICAL CANDIDATE PROFILE ---", file=sys.stderr)
    print(json.dumps(unified_profile, indent=2))

if __name__ == "__main__":
    test_live_merge()
