# AI Talent Intelligence Platform

A recruiter platform that ingests real candidate signal (currently: GitHub),
normalizes it, resolves duplicate identities into a single canonical
candidate, collects citable evidence, scores candidates against
recruiter-defined rubrics, validates every claim behind a screening result
against its source evidence, and surfaces all of it in a Next.js recruiter
UI.

Pipeline: **GitHub API → ingestion → normalization → entity resolution →
canonical candidate → evidence → search → rubric → screening agent →
citation validation → recruiter UI**

## Stack

- **Backend**: FastAPI + SQLAlchemy 2.0 + Alembic + SQLite (swappable for
  Postgres via `DATABASE_URL`), JWT auth, DB-backed background job queue
- **Frontend**: Next.js 14 (App Router) + TypeScript, no UI framework deps
- **Screening**: rule-based rubric scoring (deterministic, auditable) with
  an optional Claude-generated narrative summary layered on top — the
  numeric score and recommendation never come from the LLM
- **Citation validation**: every skill claim used in scoring is checked
  against the literal text of its source evidence before counting

## Repository layout

```
backend/
  app/
    connectors/        # GitHubConnector (real API + offline fixtures)
    normalization/      # raw payload -> NormalizedIdentity
    entity_resolution/  # duplicate detection / merge decisions
    evidence/            # evidence retrieval helpers
    search/              # candidate search
    rubric/               # rubric scoring engine
    screening/            # screening agent orchestration
    citation/             # citation/claim validation
    jobs/                 # DB-backed background worker
    routers/              # FastAPI route handlers
    core/                  # auth + audit logging
    services/              # ingestion pipeline orchestration
    models.py, schemas.py, main.py, config.py, db.py, seed.py
  alembic/                 # migrations (hand-written initial revision)
  fixtures/github/         # offline GitHub API fixtures
  tests/
    test_pure_logic.py     # stdlib-only, ZERO deps, runs anywhere
    test_api.py             # full-stack pytest suite (needs deps installed)
frontend/
  app/                       # Next.js App Router pages
  components/, lib/api.ts    # API client
docker-compose.yml
```

## Running locally (with dependencies installed)

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # edit as needed
alembic upgrade head            # or rely on create_all() at startup
python -m app.seed              # optional: seed demo data
uvicorn app.main:app --reload   # http://localhost:8000

# Worker (separate terminal, optional — only needed for /jobs/enqueue)
python -m app.jobs.worker

# Frontend (separate terminal)
cd frontend
npm install
cp .env.example .env.local
npm run dev                     # http://localhost:3000
```

Default login: the email/password in `ADMIN_EMAIL`/`ADMIN_PASSWORD`
(`.env.example` defaults to `admin@example.com` / `change-me-admin-password`
— change this before any real deployment).

## Running with Docker

```bash
cp backend/.env.example backend/.env    # edit as needed
docker compose build
docker compose up
```

Backend on `:8000`, frontend on `:3000`. The frontend build/image was not
executed inside the sandbox that produced this repo (see FINAL_STATUS.md) —
verify `docker compose build` on your machine before relying on it.

## Environment variables

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | no (defaults to SQLite) | SQLAlchemy connection string |
| `SECRET_KEY` | yes for prod | JWT signing key |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | no (has defaults) | seed admin user on first startup |
| `GITHUB_TOKEN` | no | enables live GitHub API ingestion; without it, either set `GITHUB_OFFLINE_FIXTURES=true` or expect GitHub's unauthenticated 60 req/hr rate limit |
| `GITHUB_OFFLINE_FIXTURES` | no (default `true`) | force offline fixture-based ingestion for `octocat`/`janedoe` demo users |
| `ANTHROPIC_API_KEY` | no | enables an LLM-written prose summary on screening results |
| `SCREENING_USE_LLM_SUMMARY` | no (default `false`) | toggles the above |
| `NEXT_PUBLIC_API_BASE_URL` (frontend) | no (defaults to `localhost:8000`) | backend base URL |

## Tests

```bash
# Zero-dependency logic tests (normalization, entity resolution, rubric
# scoring, citation validation) — runs with plain python3, no installs:
python3 -m unittest discover -s backend/tests -p "test_pure_logic.py" -v

# Full-stack API tests (needs `pip install -r requirements.txt` first):
cd backend && pytest tests/test_api.py -v
```

See `FINAL_STATUS.md` for exactly what has and hasn't been executed/verified.
