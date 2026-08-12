# WorkX — Repo Guide (read this first)

WorkX is a career/portfolio platform: users upload a CV, get an AI profile analysis (Analysis 1), chat with an AI tutor, and can escalate to a gap-analysis / study plan. Everything funnels through an **async job pipeline** driven by Redis (Celery broker + progress stream).

This file is the entry point. Per-component details live in the component `AGENTS.md` files — read the one for whatever you're working on:

| Component | Stack | Where |
|---|---|---|
| `BE/AGENTS.md` | ASP.NET Core 8, EF Core + Npgsql, Clerk JWT, SignalR | API + job orchestration, port 5000 |
| `FE/AGENTS.md` | React 19 + Vite, Ant Design, Clerk, SignalR client | UI, dev 5173 / docker 4200 |
| `Worker/AGENTS.md` | Python 3.11, Celery, redis-py | AI work (consumes queue, calls BE over HTTP) |
| `REDIS/AGENTS.md` | redis:7 (compose service `redis`) | Celery broker + progress stream glue |
| — | Postgres 16 (`db`), MinIO (`minio`) | Data store, S3-compatible file storage |

## Getting started

- `make setup && make run` — supported onboarding. `make run` calls `./startup.sh`, builds `workx-be` / `workx-fe` / `workx-worker`, and runs the whole local stack. Requires Docker.
- Manual: `docker compose up -d --build`. Stop: `docker compose down`. Logs: `docker compose logs -f`.
- Env: `.env.example` is the portable template. `make setup` copies it to the gitignored root `.env` only when missing. `.env.development` remains as existing reference data but is not loaded automatically.

### Ports
| Service | URL |
|---|---|
| Frontend (nginx build) | http://localhost:4200 |
| Backend / Swagger | http://localhost:5000 / http://localhost:5000/swagger |
| MinIO API / console | http://localhost:9000 / http://localhost:9001 (minioadmin/minioadmin) |
| Postgres | localhost:5432 |
| Redis | localhost:6379 |

## Architecture: the async job pipeline (core concept)

Every user action — a chat message, a CV confirm — becomes a `Job` row first, then a message on the queue. **Record is created before the message is published.**

```
chat/CV-confirm
   → BE creates Jobs row (queued), publishes Kombu-format msg to Redis list `celery`
   → Celery worker (task `worker.tasks.process_job`) pops it, reads job details from BE over HTTP
   → worker does the AI work, publishes progress to Redis stream `job-progress-stream`
   → BE BackgroundService JobProgressStreamConsumer reads stream, updates Stage/Progress
   → BE pushes job_status_update over SignalR (/hubs/job-status) to the owning user
   → worker POSTs the result back to BE (backend owns ALL writes)
```

State: `queued → processing → completed | failed`. Never leave a job stuck in `processing`.

### Hard invariants (breaking these silently breaks the pipeline)
- Task name must match on BOTH sides: `worker.tasks.process_job` (BE `Redis__CeleryTask` / worker `CELERY_TASK`). Queue: `celery`.
- **The worker has NO database access.** It talks to BE only via `/api/internal/ai/*` endpoints, authenticated with `X-Service-Token: <ServiceAuth:Token>`. BE owns every write (`Jobs`, `UserAnalyses`, `ProfileScores`, parsed `Users` fields).
- Progress is published by the worker to the Redis stream; only the `JobProgressStreamConsumer` writes `Stage`/`Progress`.
- User-facing endpoints use **Clerk JWT** (`Authorization: Bearer`). Internal endpoints use the service token. Don't confuse the two.
- Job result payloads are polymorphic (string for plain chat, object for analysis) — one `ResultJson` column holds either.

## Contracts doc

`CONTRACTS.md` is the cross-team contract for the whole pipeline (job lifecycle, Kombu message format, internal endpoint shapes, DB schema). **Read it before touching the pipeline.** Caveat: it lags the code — e.g. §8 claims the Worker doesn't exist yet and ownership table names are stale. Trust the code/config over prose; treat `CONTRACTS.md` as the spec, not the source of truth.

## Repo-wide gotchas

- Worker reads env var `SERVICE_TOKEN` but compose/`.env.development` set `SERVICE_AUTH_TOKEN` (`Worker/app/backend_client.py:5`). Works today only because both default to `dev-service-token`. Fix or remember when adding real auth.
- Kombu message envelope in `BE/Services/JobQueueService.cs` uses literal kebab/snake_case keys (`content-type`, `root_id`, `delivery_tag`, ...). Do NOT "clean up" the casing — Celery rejects camelCase.
- `.env` is gitignored; `.env.development` is the committed dev config. Put secrets (Groq key, GitHub/LinkedIn secrets) only in local `.env`.
- Two stray 0-byte tracked files at root (`StackExchange.Redis.RedisConnectionException`, `docker`) are junk from an old crash; don't add more.
- Deploy: `make deploy BRANCH=<branch>` runs a manual Cloud Build trigger. The staging VM pulls immutable images and uses `deploy/vm/docker-compose.yml`; it does not build or clone the repository.

## Layout
- `BE/` — ASP.NET Core API (see `BE/AGENTS.md`)
- `FE/` — React SPA (see `FE/AGENTS.md`)
- `Worker/` — Celery worker (see `Worker/AGENTS.md`)
- `contracts/` — `analysis1-result-schema.json` (AI result schema reference)
- `scripts/` — platform startup scripts (mac/linux)
- `docker-compose.yml` — all infra + services
