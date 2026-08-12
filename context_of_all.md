# WorkX complete project context

> Snapshot date: 2026-08-10 (Africa/Cairo)  
> Workspace: `/Users/marwan.essam-mac-alex/iti/full_gp`  
> Purpose: engineering and operations handover for the WorkX application, AI service, and staging deployment.

## 1. Purpose and source-of-truth rules

WorkX is a career platform where a user can upload a CV, combine it with GitHub and LinkedIn information, receive a profile analysis, talk with an AI career assistant, compare their profile with real jobs at a target company, and receive a study plan for a selected job.

Two repositories implement the system:

| Repository/component | Responsibility |
|---|---|
| [`Ai-career-service`](Ai-career-service/) | FastAPI/LangGraph AI core: profile parsing, company/job research, vector retrieval, gap analysis, and study-plan generation. |
| [`ITI_GP`](ITI_GP/) | Product application: React frontend, ASP.NET backend, Celery worker, product Postgres, Redis, and MinIO. |

This document follows this precedence when sources disagree:

1. Current executable code and Compose/configuration files.
2. Runtime state observed on `workx-staging` on 2026-08-10.
3. Current repository guides and READMEs.
4. Historical handoff, integration, and planning documents.

Terms used below:

- **Current code** means the checked-out `last-touch` branch.
- **Live snapshot** means read-only observations made on 2026-08-10; counts and health can change.
- **Historical note** explains how the current design was reached but is not necessarily current behavior.
- **Known drift** is documentation, mock code, configuration, or deployment state that differs from the authoritative implementation.

No secret values, private keys, tokens, passwords, user messages, resumes, or personally identifying records are copied into this file. Secret locations and variable names are documented so credentials can be found and rotated safely.

## 2. Repository inventory and Git state

### 2.1 AI service repository

- Local path: `/Users/marwan.essam-mac-alex/iti/full_gp/Ai-career-service`
- Branch: `last-touch`
- Current commit: `d3704a5` (`Harden staging deployment observability`)
- Tracking state: matches `origin/last-touch`
- Relative history: 26 commits ahead of `origin/master`
- Remote repository: `hussainmansour/Ai-career-service`
- Tracked files were clean at inspection time.

Existing untracked material was intentionally left untouched:

- `HANDOFF.md`
- `chat-flow-unified.html`
- `context.md` (empty)
- `finalizing.md`
- `node8_gap_analysis_explainer.html`
- `palns.md`

These files contain useful historical reasoning, but current code overrides any stale claim in them. The main current entry points are [`README.md`](Ai-career-service/README.md), [`how-to-use.md`](Ai-career-service/how-to-use.md), [`app/main.py`](Ai-career-service/app/main.py), and [`app/graph/graph.py`](Ai-career-service/app/graph/graph.py).

### 2.2 WorkX application repository

- Local path: `/Users/marwan.essam-mac-alex/iti/full_gp/ITI_GP`
- Branch: `last-touch`
- Current commit: `f39811a` (`fix: harden staging profile and storage flows`)
- Tracking state: matches `origin/last-touch`
- Relative history: 11 commits ahead of `main`
- Remote repository: `faris0007/ITI_GP`
- Working tree was completely clean at inspection time.

Component guides:

- [`AGENTS.md`](ITI_GP/AGENTS.md): repository overview and hard invariants.
- [`BE/AGENTS.md`](ITI_GP/BE/AGENTS.md): backend.
- [`FE/AGENTS.md`](ITI_GP/FE/AGENTS.md): frontend.
- [`Worker/AGENTS.md`](ITI_GP/Worker/AGENTS.md): Celery worker.
- [`REDIS/AGENTS.md`](ITI_GP/REDIS/AGENTS.md): Redis queue and stream.

### 2.3 Live source deployment model

Neither deployed directory on the VM has a `.git` directory. Deployments are source archives built into Docker images on the VM, so `git log` cannot identify the live commit. Source checksums were used instead:

- The deployed AI application source matched the local `last-touch` source completely.
- WorkX core source matched the local `last-touch` source.
- Aggregate WorkX directory differences were explained by local `Worker/.pytest_cache` files and two remote-only deployment artifacts: `deploy/staging/.env` and `deploy/staging/activate-https.sh`.

## 3. System architecture and ownership

```text
Browser / React frontend
        │
        │ Clerk JWT, REST, SignalR
        ▼
ASP.NET Core backend ─────── Product PostgreSQL
        │                   Users, resumes, jobs, sessions, analyses, plans
        │
        ├─────────────────── MinIO
        │                   Private resume objects and pre-signed URLs
        │
        │ creates Jobs row, then LPUSHes Kombu message
        ▼
WorkX Redis
  list: celery             stream: job-progress-stream
        │                           ▲
        ▼                           │ progress events
Celery worker                      │
        │                           │
        ├─ GET/POST backend internal endpoints
        └─ POST FastAPI AI endpoints
                    │
                    ▼
             AI career service
                    ├─ Vertex AI
                    ├─ Apify / ATS APIs / Crawl4AI
                    ├─ AI PostgreSQL role cache
                    └─ Qdrant role vectors
```

Hard ownership boundaries:

- The ASP.NET backend creates a `Jobs` row **before** publishing the queue message.
- The worker has no direct database access. It drives jobs through HTTP only.
- The ASP.NET backend owns all product writes: users, jobs, chat, analyses, scores, gap analyses, and study plans.
- The AI service does not persist user profiles or conversations. It pulls authoritative user/session data from backend internal endpoints when needed.
- The AI service owns only its role/company research cache in its own Postgres and Qdrant.
- Redis has two separate responsibilities: Celery delivery and progress streaming.
- Progress writers stop short of completion; the backend is the only terminal-state owner and sets progress to 100.

## 4. End-to-end product flows

### 4.1 CV upload and Analysis 1

1. The frontend calls `POST /resumes/upload-intent` with filename, type, and size.
2. The backend creates a `ResumeFile` row and returns a pre-signed MinIO PUT URL.
3. The browser uploads the PDF directly to MinIO. The file does not pass through the backend process.
4. The frontend calls `POST /resumes/{id}/confirm`.
5. The backend confirms the resume and creates or reuses an `analysis1` job. A previous analysis is marked stale when a newer CV supersedes it.
6. The backend publishes the job ID to Redis in Celery/Kombu format.
7. The worker fetches job details from `GET /api/internal/ai/jobs/{jobId}` and marks the job `processing`.
8. The worker requests a short-lived internal resume download URL and downloads the PDF from MinIO.
9. The worker calls `POST /api/v1/ai/parse-cv` on the AI service, including optional GitHub/LinkedIn inputs.
10. The AI service parses available sources concurrently. One source failing does not block the others. Vertex fuses successful sources into the Analysis 1 contract.
11. The worker best-effort submits score breakdown data, then submits the completed result.
12. The backend upserts `UserAnalyses`, clears staleness, associates the source resume, stores profile scores, completes the job, and broadcasts the terminal update.
13. The frontend restores both persisted data and active work through `GET /api/analysis1/state`; it does not queue work merely because a page was refreshed.

Important behavior:

- `POST /api/analysis1/start` deduplicates queued/processing Analysis 1 jobs.
- `GET /api/analysis1/latest` and `/state` are read-only.
- A stale analysis is deliberately hidden from the AI context endpoint until the replacement parse completes.
- The resume confirmation response returns `analysisJobId`; `null` means that exact resume was already handled.

### 4.2 Normal chat

1. The browser calls `POST /api/chat/message` with content and an optional session ID.
2. The backend applies Clerk authentication, confirmed-CV requirements, and the daily chat quota.
3. It creates or resolves the chat session and retrieves the rolling `SummaryText`.
4. It creates a chat job and persists the triggering user message with the same job ID.
5. The worker calls the AI service with `user_id`, `job_id`, `session_id`, `message`, and `context_summary`.
6. Node 1 classifies the turn. Chitchat, rejection, and clarification paths return directly without research.
7. The worker posts the response to the backend.
8. The backend stores the assistant message and best-effort updates the rolling session summary.

### 4.3 Gap analysis

1. Node 1 recognizes a new analysis request, extracts company and role, canonicalizes the role, and applies deterministic policy checks.
2. The AI service pulls the user's persisted Analysis 1 profile from the backend. Conversation summary is context only, never proof.
3. Node 3 calls the research facade. PostgreSQL's `claim_role` procedure decides whether the role is ready, must be researched, or is owned by another worker.
4. A cold role triggers company/careers discovery, ATS-specific fetching where possible, generic crawling where necessary, role-relevance filtering, structuring, embedding, and storage.
5. Re-indexing compares posting identities/content hashes and avoids restructuring unchanged postings.
6. Node 7 searches Qdrant, then hydrates full structured posting data from AI Postgres.
7. Node 8 compares the candidate against individual real postings, producing per-job match scores, matched skills, missing skills, required/preferred importance, strengths, weaknesses, technology-choice groups, and a Markdown report.
8. The graph stops with `awaiting_user_input=true`; it does not create a study plan in the same turn.
9. The backend persists the structured gap-analysis payload under the current user and chat session.

### 4.4 Study-plan continuation

This is a new chat job, not a resumed Celery task:

1. The frontend posts the selected job/technology choices to `POST /api/chat/sessions/{id}/tech-choices`.
2. The backend verifies that the referenced job belongs to the user and session.
3. It converts the selection map into a natural-language message and creates an ordinary chat job.
4. Node 1 pulls the prior gap analysis from `GET /api/internal/ai/gap-analysis/{userId}?sessionId=...`.
5. It resolves the job and technology choices only against that authoritative payload.
6. The graph routes directly to node 9, skipping research and gap analysis.
7. Node 9 filters missing skills to the selected posting and technology choices, generates and validates a plan, enriches resources when enabled, and uses a deterministic fallback if generation repeatedly fails validation.
8. The backend persists the result in `UserStudyPlans`.
9. `GET /api/plans`, `GET /api/plans/{id}`, and `PUT /api/plans/{id}/progress` expose plans and validate task/week completion.

The live snapshot contained zero persisted study plans. The path is implemented, but a live stored result had not yet exercised it.

### 4.5 Progress and terminal status

- Redis stream: `job-progress-stream`
- Event fields: `job_id`, `stage`, `percent`
- Backend consumer group: `system-service-group`
- SignalR endpoint: `/hubs/job-status`
- SignalR event: `job_status_update`
- SignalR group: `job:{jobId}`

The backend applies stream updates only when the job status is `processing`. It stores `Stage` and `Progress`, broadcasts the same event shape used for status transitions, acknowledges entries, and reclaims entries idle for more than two minutes. The frontend first reads current HTTP status, subscribes through SignalR, reconciles again after subscribing, and falls back to polling after eight seconds. Its overall poll ceiling is 370 seconds.

## 5. AI career service

### 5.1 Stack and entry points

- Python `>=3.12,<3.13`
- FastAPI 0.115 and Uvicorn
- LangGraph 1.2.10
- `google-genai`/Vertex AI as the only LLM provider
- SQLAlchemy/PostgreSQL for role research state
- Qdrant for semantic vectors
- Redis for progress publication
- Apify, ATS APIs, Crawl4AI, and Playwright for research
- PyMuPDF with Tesseract/Poppler OCR fallback
- `uv`, [`pyproject.toml`](Ai-career-service/pyproject.toml), and `uv.lock` for dependency locking

[`Dockerfile`](Ai-career-service/Dockerfile) builds a Python 3.12 image with Chromium, Tesseract, Poppler, and compiled-dependency support. Local development normally runs the app on the host while [`docker-compose.yml`](Ai-career-service/docker-compose.yml) runs Postgres, Qdrant, and Redis. Staging uses [`docker-compose.prod.yml`](Ai-career-service/docker-compose.prod.yml).

### 5.2 HTTP endpoints and authentication

| Endpoint | Purpose | Authentication |
|---|---|---|
| `GET /health` | Orchestration health check | Public |
| `POST /api/v1/ai/process` | Unified chat/gap/study request | `X-Service-Token` |
| `POST /api/v1/ai/parse-cv` | WorkX Analysis 1 parsing contract | `X-Service-Token` |
| `POST /parse/profile/upload` | Backward-compatible parser alias | `X-Service-Token` |
| `POST /research/jobs` | Start operational indexing | `X-Service-Token` |
| `GET /research/jobs/{job_id}` | Research-job progress | `X-Service-Token` |
| `POST /research/roles/{role_id}/refresh` | Force refresh | `X-Service-Token` |
| `GET /research/roles/{role_id}` | Role-cache status | `X-Service-Token` |

`/api/v1/ai/process` returns one authoritative wire discriminator, `responseType`, with values:

- `normal_text` and root-level `reply`
- `gap_analysis` and nested `response`
- `study_plan` and nested `response`

In production/staging, a blank backend service token prevents startup. Token comparison is constant-time. Request logging redacts authorization, cookies, and service-token headers; multipart CV bodies are logged only as byte counts.

### 5.3 Current graph

```text
understand
 ├─ CHAT / REJECT / CLARIFY / error ───────────────────────────→ END
 ├─ RUN_GAP_ANALYSIS → knowledge_check → retrieve → analyze_gap → END
 └─ BUILD_STUDY_PLAN → plan_study ─────────────────────────────→ END
```

Historical node numbering no longer maps one-to-one to modules:

- Node 1 is the gatekeeper package under `app/graph/nodes/n1/`.
- Former node 2 is the standalone profile-parsing API.
- Research/structure/store work formerly described as nodes 4–6 lives in `app/research/`.
- Node 3 asynchronously waits for research/indexing.
- Node 7 retrieves cached knowledge.
- Node 8 performs gap analysis and renders its report.
- Node 9 generates and renders a later-turn study plan.
- Node 10 does not exist; a third renderer would be redundant.

### 5.4 Gatekeeper and security model

The design rule is “the LLM proposes; plain Python decides.”

- LLM calls classify the turn and extract candidate strings.
- `policy.decide()` makes routing/cost decisions from real evidence.
- Off-topic, suspicious, and chitchat turns are rejected or answered before expensive extraction/research.
- The history summary is untrusted context.
- A study plan requires a gap analysis fetched from the product backend for the same user/session.
- Track selection resolves only against real prior jobs.
- Company absence from Wikidata is not treated as proof that the company is fake.
- User-derived URLs pass public-HTTPS and private-network guards.
- Redirects are followed manually and validated at every hop to prevent blind SSRF.

### 5.5 Research pipeline and storage

[`app/research/facade.py`](Ai-career-service/app/research/facade.py) is the supported public entry point. It owns `ensure_indexed`, background research jobs, status lookup, and forced refresh.

The PostgreSQL `claim_role(text, integer, integer, boolean)` function serializes work on a role row. A waiting worker reclaims periodically, allowing an expired lease to recover when an owner dies. The procedure must exist before the application is useful; it is checked by the deploy script and initialized through `scripts.init_db` when explicitly requested.

Research uses:

- Search-based careers-site discovery rather than guessed domains.
- Deterministic link filtering/scoring.
- Known ATS handlers for Greenhouse, Lever, Ashby, SmartRecruiters, Recruitee, Workable, Workday, and Eightfold.
- Generic browser/crawl fallback for unsupported sites.
- Per-posting relevance filtering and a configured maximum of 25 jobs.
- Batch structuring and embedding with bounded concurrency.
- Posting identity/content hashes to retain unchanged data and remove disappeared postings.
- Company/about-page research stored separately from job knowledge.

AI Postgres tables:

| Table | Role |
|---|---|
| `indexed_roles` | Canonical role, freshness, status, version, and lease state. |
| `indexed_role_chunks` | Full structured posting/company JSON and posting identity. |
| `research_jobs` | Operational research progress and error state. |
| `role_aliases` | Cached raw-title to canonical-role mapping. |
| `company_profiles` | Cached company/about information. |

Qdrant collection `role_knowledge` holds vectors and compact lookup metadata. Full structured knowledge remains in PostgreSQL and is hydrated after vector search.

### 5.6 Gap analysis and study-plan contracts

Node 8 produces:

- Per-real-posting scores with posting IDs and URLs.
- Aggregate skill coverage.
- Matched and missing skills.
- Required/preferred importance and posting frequency.
- Strengths, weaknesses, summary, urgency, and degraded/error indicators.
- Technology-choice groups when interchangeable alternatives exist.
- A Markdown user report.

Required skills appearing in too few postings are demoted to preferred, preventing one unusual job description from dominating the whole plan. Skill matching uses normalized exact matching first and semantic fallback when needed.

Node 9 validates that:

- Every focus skill came from the selected gap analysis.
- Required skills are scheduled.
- Week numbers and totals agree.
- Every week has a valid structure.

It tries structured LLM generation up to the configured retry behavior, then produces a deterministic fallback. Resource enrichment uses Tavily/YouTube when enabled and marks links as verified only when a real result was found.

### 5.7 Live model routing

Observed non-secret model settings:

| Workload | Model |
|---|---|
| Request understanding | `gemini-2.5-pro` |
| Role canonicalization | `gemini-2.5-flash-lite` |
| Resume parsing | `gemini-2.5-flash` |
| Profile fusion | `gemini-2.5-flash` |
| Company profile | `gemini-2.5-flash` |
| Knowledge structuring | `gemini-2.5-flash` |
| Scraper judgments | `gemini-2.5-flash-lite` |
| Gap analysis | `gemini-2.5-pro` |
| Study plan | `gemini-2.5-pro` |
| Embeddings | `gemini-embedding-001`, dimension 768 |

The service explicitly treats model truncation as an error. The same embedding model must be used for writes and reads; changing it invalidates semantic comparability of existing vectors even if dimensions still match.

### 5.8 Failure behavior

- AI/backend client lookup failures degrade to empty context so the assistant can clarify rather than crash.
- Progress publication failures are logged but do not fail the AI operation.
- Research errors are stored and returned through graph state instead of leaking exceptions to callers.
- Structured-output validation failures retry and may use deterministic fallback.
- The public AI response maps internal errors to a generic message.
- The worker handles terminal persistence; AI service success does not by itself complete the WorkX job.

## 6. WorkX application

### 6.1 Compose services

[`docker-compose.yml`](ITI_GP/docker-compose.yml) defines:

| Service | Technology | Purpose |
|---|---|---|
| `db` | PostgreSQL 16 | Product data. |
| `redis` | Redis 7 | Celery broker/result backend and progress stream. |
| `minio` | MinIO | Private S3-compatible resume storage. |
| `minio-init` | MinIO client | One-shot bucket creation/private policy. |
| `be` | ASP.NET Core 8 | Product/API/backend state owner. |
| `worker` | Python 3.11/Celery | Job dispatcher and AI HTTP client. |
| `fe` | React/nginx | Browser application. |

### 6.2 Backend

Core stack:

- ASP.NET Core 8
- EF Core 8 with Npgsql
- Clerk JWT authentication
- SignalR
- StackExchange.Redis
- AWS SDK S3 against MinIO
- Swagger/OpenAPI
- Configurable extractive or external conversation summarization

[`BE/Program.cs`](ITI_GP/BE/Program.cs) configures global camelCase JSON, exception middleware, CORS, authentication, current-user caching, controllers, SignalR, and hosted progress/background services. EF migrations apply automatically only in Development.

Authentication is deliberately split:

- Browser/user endpoints require Clerk JWTs.
- Internal worker/AI endpoints require `X-Service-Token`.
- Internal token comparison is constant-time.
- SignalR obtains the Clerk JWT through the `access_token` query parameter.
- Job and SignalR subscriptions enforce user ownership.

Endpoint families:

| Family | Important routes |
|---|---|
| Chat | `POST /api/chat/message` |
| Sessions | create/list/messages/rename/archive and `/{id}/tech-choices` |
| Analysis 1 | `/api/analysis1/start`, `/latest`, `/state` |
| Resumes | `/resumes/upload-intent`, confirm, list, download, delete |
| Jobs | `/api/jobs/{id}/status`, `/result` |
| Profile | `/api/profile`, scores, open-to-work |
| Plans | `/api/plans`, `/{id}`, `/{id}/progress` |
| OAuth | authorize/callback/connections/disconnect |
| Internal AI | context, gap analysis, plan, jobs, resume URL, status/result, scores |
| Health | `GET /health` |

AI Tutor, CV Optimizer, and Mock Interview controllers return `501` after plan-tier checks. Feedback currently logs and returns a dummy ID; there is no feedback table.

### 6.3 Product database

| Entity/table | Purpose |
|---|---|
| `Users` | Clerk identity and user profile/preferences. |
| `ResumeFiles` | MinIO object metadata and confirmation state. |
| `UserAnalyses` | One current Analysis 1 result per user, including staleness. |
| `ProfileScores` | JSON score breakdown used by the dashboard. |
| `Jobs` | Async lifecycle, payload, polymorphic result, progress, and error. |
| `ChatSessions` | Session title, status, rolling summary, and timestamps. |
| `ChatMessages` | Durable user/assistant transcript linked to session and job. |
| `UserGapAnalyses` | Session-scoped structured gap-analysis results. |
| `UserStudyPlans` | Session-scoped plans plus separate progress JSON. |
| `OAuthTokens` | Provider tokens encrypted at rest. |
| `MessageUsages` | Chat quota windows/counts. |

The worker never writes these tables. `InternalAiController` parses the AI discriminator, stores structured payloads, appends assistant messages, updates summaries, and completes jobs.

### 6.4 Queue contract

Exact invariants:

- Redis list: `celery`
- Celery task: `worker.tasks.process_job`
- Backend operation: `LPUSH`
- Celery consumption: blocking `BRPOP`
- Message body contains `kwargs: { jobId }` and no product payload.
- `headers.id`, `properties.correlation_id`, and `properties.delivery_tag` represent the same task identifier.
- Kombu keys such as `content-type`, `content-encoding`, `root_id`, and `delivery_tag` are casing-sensitive.

The worker fetches the actual payload from the backend after consuming the ID. Renaming envelope fields for stylistic consistency will break Celery decoding.

### 6.5 Worker

- Python 3.11
- Celery 5.3.6
- Redis broker and result backend
- `task_acks_late=true`
- `task_reject_on_worker_lost=true`
- `worker_prefetch_multiplier=1`
- Supported jobs: `chat`, `analysis1`
- Maximum retries: 3
- Retry delay: `5 * 2^retry_count`
- AI process HTTP timeout: 300 seconds
- Celery soft/hard time limits: 330/360 seconds
- Analysis 1 AI timeout: 120 seconds

Dispatch sequence:

1. Fetch job.
2. Mark processing.
3. Route to chat or Analysis 1 handler.
4. Publish progress.
5. Call the AI service.
6. Validate minimum response shape.
7. Submit completed result.
8. On fatal 4xx/unsupported job, submit failure without retry.
9. On transient failures, retry; after exhaustion, best-effort submit terminal failure.

The worker uses the same service-token environment variable for calls toward both the backend and AI service. Live `MOCK_AI=false` means requests reach the real AI service.

### 6.6 Frontend

Stack:

- React 19 and TypeScript
- Vite 8
- Ant Design 6
- Clerk React
- SignalR client
- React Markdown/GFM
- nginx production runtime

The Docker build uses Node 20. Runtime variables are written into `/usr/share/nginx/html/env-config.js` by [`FE/env.sh`](ITI_GP/FE/env.sh), so production API/Clerk values can change without rebuilding the static bundle. [`FE/src/config.ts`](ITI_GP/FE/src/config.ts) reads runtime values first, Vite build values second, and a development default last.

Implemented routes/features:

- Landing, sign-in, sign-up, and SSO callback.
- Dashboard/profile/scores and onboarding.
- Knowledge graph / persisted Analysis 1.
- Geni chat, sessions, gap-analysis cards, and technology choices.
- Resume upload/list/view/delete and real analysis progress.
- Connected accounts/OAuth return.
- Persisted plan display and progress tracking.

Coming-soon or minimal areas:

- AI Tutor.
- Mock Interview.
- CV Optimizer.
- Settings is minimal.
- Pricing is minimal.
- Feedback is not persisted by the backend.

[`FE/src/services/jobService.ts`](ITI_GP/FE/src/services/jobService.ts) is the single async job-wait abstraction. All flows should use its SignalR-first/polling-fallback behavior rather than introducing custom polling loops.

## 7. Configuration and secret inventory

### 7.1 Rules

- Do not paste secret values into documentation, commits, logs, tickets, or chat.
- Never treat the development template as a staging secret source.
- Rotate related systems together; changing only one side of a shared token breaks communication.
- Removing a secret from current files does not erase it from Git history.

### 7.2 Local AI configuration

Locations:

- `Ai-career-service/.env` — local, ignored configuration.
- `Ai-career-service/.env.example` — annotated template.
- `Ai-career-service/secrets/work-at-x-sa.json` — GCP service-account key; never commit or quote.

Configured integration categories include Vertex, Apify, Serper, Tavily, YouTube, optional GitHub access, backend service auth, Postgres, Qdrant, and Redis. The local service runs with `APP_ENV=development` and local data-service URLs. The credentials path is relative to the repository.

### 7.3 Local WorkX configuration

- `ITI_GP/.env.development` exists and is tracked as the development template/source.
- No `ITI_GP/.env` existed locally at inspection time.
- A local stack normally needs an ignored root `.env` copied/reviewed from the development template.

### 7.4 VM configuration locations

- `/home/marwanessam/Ai-career-service/.env`
- `/home/marwanessam/Ai-career-service/secrets/work-at-x-sa.json`
- `/home/faris007/ITI_GP/.env`
- `/home/faris007/ITI_GP/deploy/staging/.env` exists as a remote-only artifact; do not assume Compose reads it automatically.

Live non-secret integration settings:

- AI environment: `production`
- Vertex project: `work-at-x`, region `us-central1`
- Worker real-AI mode: `MOCK_AI=false`
- Worker → AI: `http://workx-ai-app:8000`
- AI → backend: `http://workx-be:5000`
- AI → WorkX Redis: `redis://workx-redis:6379/0`
- WorkX queue/task: `celery` / `worker.tasks.process_job`
- Frontend API: `https://api.workx-iti.com`
- Backend CORS origin: `https://workx-iti.com`

Required secret invariant:

```text
AI BACKEND_SERVICE_TOKEN
          ==
WorkX/worker SERVICE_AUTH_TOKEN
```

Credentials to rotate deliberately:

- GitHub OAuth client secret.
- LinkedIn client secret retained on the VM.
- OAuth-token encryption key; rotating it invalidates existing encrypted OAuth tokens unless migration/re-auth is planned.
- Shared service token.
- GCP service-account key.
- Apify, Serper, Tavily, YouTube, and other external API credentials.

GitHub, LinkedIn, and encryption values were historically exposed in repository history and must be treated as compromised even though current Compose avoids real secret fallbacks.

## 8. Live GCP staging snapshot

> Observed read-only on 2026-08-10. Runtime state and counts will change.

### 8.1 Project and VM

| Item | Observed value |
|---|---|
| GCP project ID/name | `work-at-x` |
| Project number | `513442806449` |
| Active CLI account | `marwanesam243@gmail.com` |
| VM | `workx-staging` |
| Zone | `me-central1-a` |
| Machine | `e2-medium` |
| OS | Debian GNU/Linux 12 (Bookworm) |
| CPU platform | Intel Broadwell |
| RAM | 3.8 GiB |
| Swap | None |
| Boot disk | 40 GB `pd-standard`, about 31% used |
| Internal IP | `10.212.0.2` |
| Public IP | `34.18.98.53` |
| Docker | 29.7.1 |
| Docker Compose | 5.4.0 |

Docker, nginx, and the Certbot timer were active. The host had approximately 2.0 GiB available memory at inspection and had been up for about five days.

### 8.2 DNS, TLS, and nginx

- `workx-iti.com` resolves to `34.18.98.53`.
- `api.workx-iti.com` resolves to `34.18.98.53`.
- One ECDSA Let's Encrypt certificate covers both hostnames.
- Observed expiry: 2026-11-03.
- `workx-iti.com` proxies to frontend port 8080.
- `api.workx-iti.com` proxies to backend port 5000 and supports SignalR upgrades.
- `/workx-resumes/` proxies to MinIO API port 9000.
- nginx configuration validation succeeded.

### 8.3 Firewall and listening ports

Relevant GCP firewall rules:

- HTTP/HTTPS (`80`, `443`) allowed publicly for tag `workx`.
- A debug rule allows `5000`, `9000`, and `9001` from `0.0.0.0/0` for tag `workx`.
- Default SSH (`22`) and ICMP are public.

Host listeners:

| Service | Host binding |
|---|---|
| Frontend | `127.0.0.1:8080` |
| Backend | `127.0.0.1:5000` |
| WorkX Postgres | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |
| MinIO API | `127.0.0.1:9000` |
| AI API | `127.0.0.1:8000` |
| MinIO console | `0.0.0.0:9001` and `[::]:9001` |
| nginx | public `80` and `443` |

Loopback bindings protect 5000 and 9000 despite the permissive firewall rule. The MinIO console is genuinely exposed because both the firewall and socket allow public access.

### 8.4 Compose projects, containers, networks, and volumes

WorkX Compose project `iti_gp`, source `/home/faris007/ITI_GP`:

- `workx-db`
- `workx-redis`
- `workx-minio`
- `workx-minio-init` (successful one-shot container)
- `workx-be`
- `workx-worker`
- `workx-fe`

AI Compose project `workx-ai`, source `/home/marwanessam/Ai-career-service`:

- `workx-ai-app`
- `workx-ai-postgres`
- `workx-ai-qdrant`

Networks:

- `iti_gp_default`
- `workx-ai_default`

`workx-ai-app` joins both: its own network for AI Postgres/Qdrant and the WorkX network for backend/Redis access. This shared network and container-name DNS are essential. `host.docker.internal` does not reach loopback-bound services from a container.

Persistent storage:

- Named WorkX Postgres volume.
- Named WorkX MinIO volume.
- Named AI Postgres volume.
- Named AI Qdrant volume.
- The current Redis container has an anonymous `/data` volume, but the Compose file does not declare a named Redis persistence contract.

### 8.5 Health and resources

Observed checks:

- Public frontend: HTTP 200.
- Public backend health: HTTP 200.
- Host-local frontend, backend, and AI: HTTP 200.
- Worker container → AI container: HTTP 200.
- AI container → backend container: HTTP 200.
- AI container → WorkX Redis: TCP connection succeeded.
- All long-running containers: zero restarts and no OOM kills.
- Worker, Postgres, Redis, and MinIO health checks were healthy.
- AI app, backend, and frontend do not define Docker-level health checks.

Resource snapshot:

| Container | Approximate memory |
|---|---:|
| AI app | 416 MiB of 1.5 GiB limit |
| Backend | 253 MiB |
| Worker | 108 MiB |
| MinIO | 108 MiB |
| AI Qdrant | 88 MiB of 512 MiB limit |
| AI Postgres | 34 MiB of 256 MiB limit |

The AI image was approximately 4.62 GB because it includes the Python environment and Chromium stack.

### 8.6 Aggregate live data

No user identifiers or content were inspected for this summary.

| Data | Count/state |
|---|---:|
| Users | 5 |
| Jobs | 41 |
| Analysis 1 completed | 10 |
| Analysis 1 failed | 3 |
| Chat completed | 28 |
| Resumes | 18 |
| User analyses | 4 |
| Gap analyses | 2 |
| Study plans | 0 |
| Chat sessions | 14 |
| Chat messages | 56 |
| Indexed roles | 7 |
| Indexed roles ready | 3 |
| Indexed roles error | 4 |
| Indexed role chunks | 31 |
| Research jobs | 9 |
| Company profiles | 2 |
| Role aliases | 4 |
| Celery queue length | 0 |
| Progress stream entries | 254 |
| Stream pending entries | 0 |
| Stream lag | 0 |
| Stream consumer records | 11 |
| Qdrant collections | `role_knowledge` |

## 9. Deployment, verification, logs, and rollback

### 9.1 Intended deployment order

WorkX must be deployed first because its Compose project creates `iti_gp_default`, which the AI Compose project declares as external:

```bash
make deploy-workx
make deploy
```

Do not run these until the new-laptop blockers in section 11 are resolved.

### 9.2 Deploy-script safeguards

[`scripts/deploy_workx.sh`](Ai-career-service/scripts/deploy_workx.sh):

- Packages BE, FE, Worker, staging deployment config, and base Compose.
- Excludes Git, build outputs, dependencies, caches, and AppleDouble metadata.
- Preserves live `.env` and volumes.
- Requires loopback bindings for FE, BE, DB, Redis, and MinIO API.
- Requires non-empty service auth, GitHub OAuth, and encryption configuration.
- Builds images on the VM.
- Always applies base Compose plus the staging override.
- Does not run `docker compose down`.
- Installs/tests/reloads nginx.
- Verifies BE and worker → AI health.

[`scripts/deploy.sh`](Ai-career-service/scripts/deploy.sh):

- Packages AI `app`, `scripts`, tests, lock/manifests, Dockerfile, and production Compose.
- Preserves `.env`, mounted credentials, logs, and volumes.
- Builds `workx-ai:latest` on the VM.
- Starts AI data services first.
- Validates required tables and the exact `claim_role` signature.
- Refuses missing schema unless `--init-db` is explicitly supplied.
- Recreates only the AI app container.
- Verifies health and all three container routes.
- Prunes builder cache while retaining 2 GB.

Always use `COPYFILE_DISABLE=1 tar --no-xattrs` for Mac-to-Linux archives. Old AppleDouble `._*` files previously broke a C# build because MSBuild treated a binary sidecar as source.

### 9.3 Verification modes

[`scripts/verify_e2e.py`](Ai-career-service/scripts/verify_e2e.py) is live and state-changing: it seeds temporary product rows, queues a real Celery job, validates persistence/progress, then cleans up.

- `--chat`: fast normal-text flow.
- `--cold`: requires an absent role, invokes real external research/Vertex, may take minutes and incur cost.
- `--cache`: requires the role to exist and asserts no role version/timestamp/chunk change.

Use cold then cache with the same explicit company, role, and role ID. Simple host-loopback health checks are not proof of cross-container integration; container-origin checks or a real job are required.

### 9.4 Logs

AI application logs are bind-mounted from `/srv/app/logs` to `/home/marwanessam/Ai-career-service/logs`, so they survive app recreation. Docker uses bounded JSON logs. [`scripts/collect_logs.sh`](Ai-career-service/scripts/collect_logs.sh) collects bounded container/nginx logs, system health, recent progress, jobs/messages, indexed roles, and research jobs, then redacts only the exported local copy.

The bundle can still contain sensitive operational context after automated redaction; review it before sharing externally.

### 9.5 Rollback inventory

Image tags:

- `workx-be:pre-ai-integration-backup`
- `workx-fe:pre-ai-integration-backup`
- `workx-worker:pre-ai-integration-backup`

VM artifacts:

- `/home/faris007/ITI_GP-backup-20260808-175735.tar.gz`
- `/home/faris007/ITI_GP-old-staging-deployment`
- `/home/marwanessam/WorkXDb-pre-migration-backup-1786256407.dump`

Rollback changes live state. Inspect timestamps and create a fresh database backup before any future rollback or migration.

## 10. Known risks, bugs, and documentation drift

| Item | Evidence/impact | Recommended future action |
|---|---|---|
| Public MinIO console | Port 9001 listens on all interfaces and the firewall permits it. | Restrict/remove the public rule or bind the console to loopback/VPN/IAP. |
| Broad debug firewall | Ports 5000, 9000, and 9001 are allowed from the internet. Loopback currently mitigates only 5000/9000. | Narrow sources or delete the debug rule after confirming operational needs. |
| Tight VM memory | 3.8 GiB total, no swap; Chromium is the spike risk. | Monitor OOM/restarts; reduce research concurrency/jobs or resize to an 8 GiB VM. |
| Role-cache errors | 4 of 7 indexed roles are `error`. | Inspect bounded research logs/errors and decide whether to retry, fix, or clean stale entries. |
| Study plan not live-proven | Code exists, but live `UserStudyPlans` count is zero. | Run a controlled authenticated flow or the verifier after local/deploy blockers are resolved. |
| Missing app health checks | AI app, BE, and FE show no Docker health state. | Add meaningful container health checks in a separate change. |
| Redis consumer records | Group has 11 consumers but zero pending/lag. | Monitor; optionally clean stale consumers as an operations task. |
| AI `CLAUDE.md` drift | Early sections describe nodes 4/8/9/10 as stubs and an old graph/version. | Update or replace after this context is accepted; trust current README/code meanwhile. |
| `CONTRACTS.md` drift | Claims worker is missing, job type escalates, and progress is gap-only. | Reconcile with current backend/worker/stream behavior. |
| Integration-report drift | Says AI emits dual discriminator spellings. Current code emits `responseType` only. | Mark report historical or update it. |
| Frontend comment drift | `chatService.ts` labels tech-choice endpoint a placeholder, but the backend route exists. | Correct comment without changing the working contract. |
| Worker health-file drift | Dockerfile references missing `health_check.py`; Compose overrides it with Celery ping. | Either add the file or remove the misleading Dockerfile health check. |
| Worker mock contract drift | Mock gap-analysis fields are root-level while the real contract nests them under `response`. | Align mock payloads before relying on local `MOCK_AI=true` tests. |
| Legacy AI env keys | VM AI `.env` still contains old gap-token settings not present in current Settings. | Remove during a reviewed secret/config cleanup after confirming no rollback needs them. |
| Environment label drift | Live AI uses `APP_ENV=production`; handover text recommends `staging`. Safety check treats both as deployed. | Choose one naming convention and align docs/config. |
| Historical secret exposure | OAuth/encryption secrets existed in Git history. | Rotate; do not assume deleting current fallbacks is sufficient. |
| Artifact deployments lack commit metadata | Deployed directories have no Git history. | Stamp images/deployments with commit SHA and source checksum. |
| Redis persistence ambiguity | No declared named Redis volume, though current container has an anonymous data mount. | Decide whether queue/stream persistence is required and configure explicitly. |

## 11. New-laptop readiness and blockers

The workspace was copied from an older Intel Mac to a new arm64 Mac. It is not ready for local builds or deployment yet.

### 11.1 Observed local tool state

| Tool/state | Observation |
|---|---|
| CPU architecture | `arm64` |
| Node | 26.7.0 |
| npm | 11.19.0 |
| Project Docker build Node | 20 |
| System Python | 3.14.6, unsupported by AI project |
| `uv` | Not installed/on `PATH` |
| `.NET` SDK | Not installed/on `PATH` |
| Docker CLI | Installed |
| Docker daemon | Not running |
| GCP CLI | Present only at `~/Downloads/google-cloud-sdk/bin/gcloud`, version 486.0.0 |
| GCP auth | `marwanesam243@gmail.com` active |

The copied AI `.venv` is broken. Its Python symlink targets the old path and Intel runtime:

```text
/Users/marwanessam/.local/share/uv/python/cpython-3.12-macos-x86_64-none/bin/python3.12
```

The copied frontend `node_modules` also came from the old architecture. `npm run lint` cannot load Oxlint's Darwin arm64 binding, and `npm run build` cannot load Rolldown's Darwin arm64 binding. These failures describe stale dependencies, not source-code failures.

### 11.2 Deployment-script path blockers

- Deploy scripts invoke bare `gcloud`, but GCP CLI is not on `PATH`.
- `deploy_workx.sh` defaults to `../work-at-x-BE-FE/ITI_GP`; the actual sibling is `../ITI_GP`.
- A temporary workaround is to set `ITI_GP_LOCAL_DIR` explicitly, but correcting the default is safer long-term.

### 11.3 SSH ownership blocker

The new laptop's `gcloud compute ssh` maps to VM user `marwan.essam-mac-alex`. That user is in `google-sudoers` and `docker`, but:

- `/home/marwanessam/Ai-career-service` is owned by `marwanessam` and is not writable.
- `/home/faris007/ITI_GP` is not writable by the current SSH principal.
- WorkX deploy uses sudo for most replacement operations.
- AI deploy performs source deletion/extraction without sudo and will fail under the current principal.

Resolve this intentionally by fixing script privilege handling or remote ownership/access. Do not broadly `chown /home` or weaken permissions.

### 11.4 Future bootstrap order (not executed)

1. Install or expose GCP CLI on `PATH` and verify the active project/account.
2. Install `uv` and a Python 3.12 arm64 runtime.
3. remove/recreate the AI `.venv` with `uv sync --frozen`.
4. Install Playwright Chromium through the project setup command.
5. Remove copied frontend `node_modules` and reinstall with `npm ci` on arm64.
6. Install .NET 8 SDK, or decide to verify backend builds through Docker only.
7. Start Docker Desktop and verify the daemon.
8. Create/review a local ignored `ITI_GP/.env` without copying staging secrets unnecessarily.
9. Correct `ITI_GP_LOCAL_DIR` behavior.
10. Correct remote deployment permissions.
11. Run local unit tests, frontend lint/build, backend build, Worker tests, and Compose validation.
12. Only then consider a live deployment or cost-incurring verifier.

## 12. Practical command reference

The labels below matter:

- **Read-only**: safe inspection.
- **Local mutation**: changes local caches/files/processes.
- **Live mutation**: changes VM/GCP/database/container state.
- **External cost**: can invoke paid APIs.

### 12.1 Repository inspection — read-only

```bash
git -C /Users/marwan.essam-mac-alex/iti/full_gp/Ai-career-service status --short --branch
git -C /Users/marwan.essam-mac-alex/iti/full_gp/ITI_GP status --short --branch
```

### 12.2 GCP and VM inspection — read-only apart from temporary SSH metadata

The current full CLI path is used because `gcloud` is not on `PATH`:

```bash
/Users/marwan.essam-mac-alex/Downloads/google-cloud-sdk/bin/gcloud \
  compute ssh workx-staging \
  --zone=me-central1-a \
  --project=work-at-x
```

`gcloud compute ssh` may automatically update temporary project SSH metadata when establishing access.

On the VM, read-only checks:

```bash
docker ps -a
docker stats --no-stream
docker network ls
docker volume ls
curl -fsS http://127.0.0.1:5000/health
curl -fsS http://127.0.0.1:8000/health
sudo nginx -t
```

### 12.3 Redis inspection — read-only

```bash
docker exec workx-redis redis-cli LLEN celery
docker exec workx-redis redis-cli XLEN job-progress-stream
docker exec workx-redis redis-cli XINFO GROUPS job-progress-stream
```

Avoid `DEL`, `FLUSHDB`, and `FLUSHALL` during diagnosis.

### 12.4 Local development — local mutation

After rebuilding the toolchain:

```bash
cd /Users/marwan.essam-mac-alex/iti/full_gp/Ai-career-service
make setup
make db-up
make db-init
make run
```

```bash
cd /Users/marwan.essam-mac-alex/iti/full_gp/ITI_GP
./startup.sh
```

These commands create environments, containers, databases, caches, and local configuration.

### 12.5 Deployment — live mutation

Only after section 11 blockers are resolved:

```bash
cd /Users/marwan.essam-mac-alex/iti/full_gp/Ai-career-service
make deploy-workx
make deploy
```

Deployment rebuilds images and recreates live application containers. It is not an inspection command.

### 12.6 Verification — live mutation, sometimes external cost

```bash
make verify ARGS=--chat
```

Cold/cache modes:

```bash
make verify ARGS=--cold \
  VERIFY_COLD_COMPANY='<company>' \
  VERIFY_COLD_ROLE='<role>' \
  VERIFY_COLD_ROLE_ID='<company>/<role>'

make verify ARGS=--cache \
  VERIFY_COLD_COMPANY='<company>' \
  VERIFY_COLD_ROLE='<role>' \
  VERIFY_COLD_ROLE_ID='<company>/<role>'
```

`--cold` invokes real scraping and Vertex calls and can incur cost. All verifier modes create temporary live records and queue a real job.

### 12.7 Diagnostic bundle — local and remote read activity

```bash
make logs
```

This reads live logs/data summaries and writes a redacted local archive. It does not change VM originals, but the resulting archive must still be handled as sensitive operational material.

## Final working assumptions

- Current code and verified runtime behavior override stale prose.
- The staging snapshot is healthy but not proof that every feature and edge case works.
- The absence of queued/pending Redis work was expected at inspection time.
- Secret inspection authorization does not justify duplicating credentials.
- Environment repair, secret rotation, firewall changes, ownership changes, migrations, deployment, and live verification are separate tasks requiring deliberate execution.

---

## 13. Deployment modernization completed on 2026-08-11 (authoritative)

This section replaces the old deployment paths and commands above. The old
details remain only as history.

### 13.1 Supported deployment flow

The staging VM no longer receives a repository checkout and no longer builds
Docker images. From either repository, a developer runs:

```bash
make deploy BRANCH=last-touch
```

The script performs this exact flow:

1. Resolve all local paths from the repository location, not the current
   user's home directory.
2. Authenticate a dedicated deploy service account inside a temporary
   `CLOUDSDK_CONFIG`. The developer's normal gcloud account/configuration is
   not changed.
3. Fetch the named branch from `origin` and resolve its full commit SHA.
4. Export only Git-tracked files from that remote commit. Local `.env`,
   credentials, untracked files, and local build outputs are not submitted.
5. Submit the tracked source archive to regional Cloud Build.
6. Cloud Build builds `linux/amd64` images, pushes immutable commit tags and
   reusable cache tags to Artifact Registry, then uploads only the small VM
   Compose/deploy bundle.
7. The VM pulls the exact commit-tagged images, reuses persistent named
   volumes, runs health/cross-service checks, and records deployment state.

Build without changing the VM:

```bash
make build BRANCH=last-touch
```

Other commands:

```bash
make deploy-status
make rollback SHA=<full-40-character-sha>
make logs
make vm-ssh
```

### 13.2 Authentication design

The local deployment identity is:

```text
workx-deploy-invoker@work-at-x.iam.gserviceaccount.com
```

The default ignored credential path in each repository is:

```text
secrets/gcp-deployer.json
```

One shared file may instead live anywhere outside the repository:

```bash
export WORKX_GCP_CREDENTIALS=/secure/path/gcp-deployer.json
```

The Cloud Build execution identity is separate:

```text
workx-cloud-builder@work-at-x.iam.gserviceaccount.com
```

The VM continues to use metadata-based SSH, not OS Login. Both deployment
identities have the custom `workxVmSshDeployer` role with only:

```text
compute.globalOperations.get
compute.instances.get
compute.instances.setMetadata
compute.projects.get
```

The successful SSH test connected as the separate remote Linux user
`workxdeploy`. The invoker can start Cloud Builds and act as the builder. It
has small custom permissions to locate and upload to only the Cloud Build
source bucket. The builder can build, write logs, push to the one Artifact
Registry repository, and SSH to the VM. The VM service account has reader
access to the one image repository.

A long-lived JSON key was selected because service-account impersonation
would still require every developer to have personal Google Cloud IAM access,
and workforce identity federation would require an external workforce IdP and
more infrastructure. The key is the pragmatic team workflow for now and is
never tracked or put in a Docker build context.

### 13.3 GCP resources

```text
Project:             work-at-x
Region:              me-central1
Artifact repository: me-central1-docker.pkg.dev/work-at-x/workx-images
VM:                  workx-staging (me-central1-a)
Remote deploy user:  workxdeploy
```

Cloud Build, Artifact Registry, Secret Manager, Resource Manager, and IAM APIs
were enabled. GitHub v2 connections named `workx-github` and
`workx-platform-github` exist, but the Cloud Build GitHub App still needs each
personal repository owner to grant repository access. This is optional and is
not a deployment blocker because the supported scripts submit an exact tracked
branch archive directly.

### 13.4 Clean VM layout

The active runtime is now under:

```text
/srv/workx/
├── config/
│   ├── ai/.env
│   ├── ai/work-at-x-sa.json
│   ├── platform/.env
│   └── platform/staging.env
├── deploy/
│   ├── ai/docker-compose.yml
│   ├── ai/remote-deploy.sh
│   ├── ai/role_claim.sql
│   ├── platform/docker-compose.yml
│   ├── platform/remote-deploy.sh
│   └── platform/nginx/workx.conf
├── logs/ai/
├── state/ai/
├── state/platform/
└── backups/
```

All live containers now have Compose config labels pointing to `/srv/workx`.
The old home-directory checkouts and old backup files were moved, not deleted,
to:

```text
/srv/workx/backups/legacy-home-20260810T222041Z
```

Pre-migration database dumps and copied configuration are in:

```text
/srv/workx/backups/migration-20260810T214952Z
```

### 13.5 Verified deployments

The initial migration used successful build-only jobs and deployed:

```text
AI commit:       4fe08df8c61868295feb7ddcead15f536fb7cb66
Platform commit: 610ccb3dfb13fc7bda355a0dc2f3e2dd1dc2c5bd
```

After migration, backend, frontend, AI, Redis, MinIO, worker-to-AI, and
AI-to-backend checks all passed. The application `.env` files were not baked
into images: Compose loads them from `/srv/workx/config` at container startup.
The frontend's startup `env.sh` generates `env-config.js` from the runtime
`VITE_*` variables.

The final deployed application commits containing the complete portable
branch-submit and Cloud Build SSH workflow are:

```text
AI last-touch:       cda4a9a9aef5a35b7c74e774a58eab5d4ed2923a
Platform last-touch: e339757b4b7a4bd4e190a87cbf55ade0973a59d6
```

The AI branch later received one documentation-only commit, so its current
`origin/last-touch` head is `676850d75736fcc96500c1b383153212f7b4d492`.
No application redeploy was needed for that documentation-only change.

Final end-to-end Cloud Build deployments:

```text
AI build:       c9b8202d-2a6c-4619-909a-0874e1d72846 (SUCCESS)
Platform build: 0f4fb9c4-845b-41d6-b981-e057acb1e676 (SUCCESS)
```

They took about 123 seconds and 111 seconds of running build time. At the
current Doha `e2-highcpu-8` list price this is roughly USD 0.04 per deployment
before any applicable billing credits/free usage.
