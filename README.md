<div align="center">

# ⚡ TalentBase AI
### Unified Talent Intelligence Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.x-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Render](https://img.shields.io/badge/Deployed_on-Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-F7DF1E?style=for-the-badge&logo=open-source-initiative&logoColor=black)](./LICENSE)
[![Anthropic Claude](https://img.shields.io/badge/LLM-Anthropic_Claude-CC785C?style=for-the-badge&logo=anthropic&logoColor=white)](https://www.anthropic.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Junaidchohan/HR-Intelligence-sys/pulls)

</div>

---

## 🌐 Hero

> **TalentBase AI** eliminates the fragmentation problem in modern talent acquisition by unifying demand signals, supply-side profiles, and cross-source entity resolution into a single, auditable intelligence layer — giving hiring teams real-time clarity on who exists, who fits, and why.

> Rather than stitching together dozens of disconnected tools, TalentBase AI owns the data end-to-end: ingesting from GitHub, arXiv, and HuggingFace, resolving duplicate identities with a proprietary graph, and delivering LLM-powered executive summaries and urgency-ranked shortlists directly to the recruiter's desk.

---

## ✨ Key Features

- **🕸️ Multi-Source Talent Graph** — Ingests and indexes candidate signals across GitHub repositories, arXiv research papers, and HuggingFace model cards. Each profile is continuously enriched with activity metrics, contribution footprints, and domain expertise tags, forming a living, queryable talent knowledge graph.

- **🔗 Entity Resolution** — A deterministic-plus-probabilistic identity resolution engine deduplicates profiles across sources using email hashing, username fuzzy matching, and publication authorship alignment. The same engineer appearing on GitHub and arXiv is collapsed into one canonical node, eliminating double-counting and noise.

- **🛡️ Auditable Screening Agent** — A Claude-backed LLM screening pipeline that evaluates every candidate against a structured job requirement and emits a structured JSON verdict — complete with a reasoning chain, matched skills, red flags, and a final recommendation tier. Every screening decision is logged and replayable for compliance.

- **⏱️ Urgency Bands** — Each open role is assigned an urgency band (Critical / High / Medium / Low) derived from headcount demand signals, time-to-fill SLA breaches, and business priority weights. Urgency bands dynamically re-rank shortlists and surface at-risk roles to talent operations leads in real time.

- **🔄 The Join Layer** — A proprietary demand-supply join engine that continuously matches open roles against the talent graph. Instead of reactive searches, the join layer proactively surfaces pre-matched candidate pools the moment a new role is created, compressing sourcing cycle time from days to minutes.

- **📋 AI Executive Summary** — After each screening run, the platform auto-generates a one-page Markdown executive summary using Claude — covering pipeline health, top candidate highlights, coverage gaps, and recommended next steps — ready to share with hiring managers without manual effort.

---

## 🏗️ Architecture Overview

```mermaid
flowchart TD
    A["👤 Recruiter / Hiring Manager\nNext.js Frontend"] -->|REST API Calls| B["⚙️ FastAPI Backend\nPython 3.11+"]

    B -->|Ingestion Workers| C1["🐙 GitHub API\nRepositories & Activity"]
    B -->|Ingestion Workers| C2["📄 arXiv API\nResearch Papers"]
    B -->|Ingestion Workers| C3["🤗 HuggingFace Hub\nModel Cards & Authors"]

    C1 & C2 & C3 -->|Normalized Records| D["🔗 Entity Resolution Engine\nDeduplication & Identity Graph"]

    D -->|Canonical Profiles| E[("🗄️ Database\nPostgreSQL / SQLite")]

    E -->|Demand + Supply Data| F["🤖 Screening Engine\nAnthropic Claude LLM"]

    F -->|Structured Verdicts| G["📋 AI Executive Summary\n& Urgency-Ranked Shortlist"]

    G -->|Response Payload| A

    style A fill:#1a1a2e,color:#e0e0e0,stroke:#7c3aed
    style B fill:#16213e,color:#e0e0e0,stroke:#0ea5e9
    style C1 fill:#0f3460,color:#e0e0e0,stroke:#22c55e
    style C2 fill:#0f3460,color:#e0e0e0,stroke:#22c55e
    style C3 fill:#0f3460,color:#e0e0e0,stroke:#22c55e
    style D fill:#1e1b4b,color:#e0e0e0,stroke:#a855f7
    style E fill:#1e293b,color:#e0e0e0,stroke:#f59e0b
    style F fill:#1a1a2e,color:#e0e0e0,stroke:#ef4444
    style G fill:#052e16,color:#e0e0e0,stroke:#4ade80
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | [Next.js 15](https://nextjs.org/) + TypeScript | Server-side rendered recruiter dashboard & role management UI |
| **Frontend** | Tailwind CSS + shadcn/ui | Design system, component library |
| **Frontend** | React Query (TanStack) | Server state management and cache invalidation |
| **Backend** | [FastAPI](https://fastapi.tiangolo.com/) (Python 3.11+) | High-performance async REST API layer |
| **Backend** | Pydantic v2 | Request/response validation and schema enforcement |
| **Backend** | SQLAlchemy 2.x + Alembic | ORM and database migration management |
| **Backend** | APScheduler | Background ingestion job scheduling |
| **Database** | [PostgreSQL 16](https://www.postgresql.org/) | Primary production datastore (structured profiles & roles) |
| **Database** | SQLite | Local development / lightweight deployment |
| **Infrastructure** | [Docker](https://www.docker.com/) | Frontend containerization and consistent deployment environments |
| **Infrastructure** | [Render](https://render.com/) | Cloud hosting for backend API and frontend static container |
| **Infrastructure** | GitHub Actions | CI pipeline for linting, testing, and deployment triggers |
| **AI / LLM** | [Anthropic Claude](https://www.anthropic.com/) (claude-3-5-sonnet) | LLM backbone for screening, scoring, and executive summary generation |
| **AI / LLM** | Custom Prompt Templates | Structured JSON output prompting for auditable decisions |
| **Data Sources** | GitHub REST API v3 | Repository activity, contributor stats, README parsing |
| **Data Sources** | arXiv API | Paper ingestion, author affiliation, topic classification |
| **Data Sources** | HuggingFace Hub API | Model card parsing, author discovery, domain tagging |

---

## 🚀 Getting Started

### Prerequisites

Ensure the following are installed on your system before proceeding:

- **Python** >= 3.11 — [Download](https://www.python.org/downloads/)
- **Node.js** >= 20.x & **npm** >= 10.x — [Download](https://nodejs.org/)
- **Git** — [Download](https://git-scm.com/)
- **Docker** *(optional, for frontend containerization)* — [Download](https://www.docker.com/)

---

### 1. Clone the Repository

```bash
git clone https://github.com/Junaidchohan/HR-Intelligence-sys.git
cd HR-Intelligence-sys
```

---

### 2. Configure Environment Variables

Copy the example environment files and populate them with your credentials.

**Backend:**
```bash
cp backend/.env.example backend/.env
```

**Frontend:**
```bash
cp frontend/.env.local.example frontend/.env.local
```

> Refer to the [Environment Variables](#-environment-variables) section below for the full list of required keys and their descriptions.

---

### 3. Set Up and Run the Backend

```bash
# Navigate to the backend directory
cd backend

# Create a Python virtual environment
python -m venv .venv

# Activate the virtual environment
# On macOS / Linux:
source .venv/bin/activate
# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Apply database migrations
alembic upgrade head

# Start the FastAPI development server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be live at **`http://localhost:8000`**
Interactive API docs: **`http://localhost:8000/docs`**

---

### 4. Set Up and Run the Frontend

Open a **new terminal** and run:

```bash
# Navigate to the frontend directory
cd frontend

# Install Node.js dependencies
npm install

# Start the Next.js development server
npm run dev
```

The application will be live at **`http://localhost:3000`**

---

### 5. (Optional) Run with Docker

To run the frontend inside a Docker container:

```bash
cd frontend
docker build -t talentbase-frontend .
docker run -p 3000:3000 --env-file .env.local talentbase-frontend
```

---

## 🔐 Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | ✅ Yes | Personal Access Token for GitHub API. Required for repository and contributor data ingestion. Generate at [github.com/settings/tokens](https://github.com/settings/tokens). |
| `ANTHROPIC_API_KEY` | ✅ Yes | API key for Anthropic Claude. Powers the LLM screening engine and executive summary generation. Obtain at [console.anthropic.com](https://console.anthropic.com/). |
| `SECRET_KEY` | ✅ Yes | A long, random string used to sign JWT authentication tokens. Generate with `openssl rand -hex 32`. |
| `DATABASE_URL` | ✅ Yes | Full connection string for the primary database. PostgreSQL example: `postgresql+asyncpg://user:password@localhost:5432/talentbase`. Use `sqlite+aiosqlite:///./talentbase.db` for local dev. |
| `HUGGINGFACE_TOKEN` | ⚠️ Recommended | HuggingFace Hub API token for authenticated access to model cards and author data. Increases rate limits significantly. |
| `ALLOWED_ORIGINS` | ✅ Yes | Comma-separated list of allowed CORS origins. Set to `http://localhost:3000` for local development. |
| `ENVIRONMENT` | ✅ Yes | Deployment environment flag. Accepts `development`, `staging`, or `production`. Controls logging verbosity and debug tooling. |
| `LOG_LEVEL` | Optional | Application log level. Defaults to `INFO`. Accepts `DEBUG`, `INFO`, `WARNING`, `ERROR`. |

### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ Yes | The full base URL of the FastAPI backend. Example: `http://localhost:8000` for local or your Render service URL for production. |
| `NEXTAUTH_SECRET` | ✅ Yes | Secret key used by NextAuth.js to encrypt session tokens. Must match `SECRET_KEY` or be independently generated. |
| `NEXTAUTH_URL` | ✅ Yes | The canonical URL of the Next.js application. Example: `http://localhost:3000` or your production domain. |

---

## ☁️ Deployment

TalentBase AI is production-deployed on **[Render](https://render.com/)**, leveraging its managed infrastructure for zero-downtime deployments and automatic TLS.

| Service | Platform | Notes |
|---|---|---|
| **FastAPI Backend** | Render Web Service | Deployed as a native Python service using `uvicorn`. Auto-deploys on push to `main`. |
| **Next.js Frontend** | Render Static / Docker | Containerized with Docker and deployed as a Render Web Service. |
| **PostgreSQL Database** | Render Managed PostgreSQL | Persistent managed database with automated backups. `DATABASE_URL` is injected as an environment secret. |

### Production Deployment Steps

1. Push your changes to the `main` branch.
2. Render automatically triggers a build for both the backend and frontend services via configured webhooks.
3. Alembic migrations run as a pre-deploy command on the backend service.
4. Health checks verify service availability before routing live traffic.

> **Note:** Set all environment variables directly in the Render dashboard under **Environment > Secret Files / Environment Variables** for each service. Never commit `.env` files to version control.

---

## 📁 Project Structure

```
HR-Intelligence-sys/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI route handlers
│   │   ├── core/           # Config, security, database session
│   │   ├── models/         # SQLAlchemy ORM models
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   ├── services/       # Business logic: ingestion, screening, join layer
│   │   └── main.py         # Application entrypoint
│   ├── alembic/            # Database migration scripts
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   ├── components/     # Reusable UI components
│   │   ├── lib/            # API client, utilities, hooks
│   │   └── types/          # Shared TypeScript type definitions
│   ├── Dockerfile
│   ├── package.json
│   └── .env.local.example
├── docker-compose.yml      # Local full-stack orchestration
└── README.md
```

---

## 🤝 Contributing

Contributions are welcome and appreciated. To get started:

1. **Fork** the repository.
2. **Create** a feature branch: `git checkout -b feat/your-feature-name`
3. **Commit** your changes with a conventional commit message: `git commit -m "feat: add candidate export endpoint"`
4. **Push** to your fork: `git push origin feat/your-feature-name`
5. **Open** a Pull Request against the `main` branch and fill out the PR template.

Please ensure all linting checks pass (`ruff check .` for Python, `npm run lint` for TypeScript) and relevant tests are included before submitting.

---

## 📄 License

```
MIT License

Copyright (c) 2024 Junaid Chohan

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

<div align="center">

**Built with ⚡ by [Junaid Chohan](https://github.com/Junaidchohan)**

*If TalentBase AI saves you sourcing time, consider giving it a ⭐ on GitHub*

</div>
