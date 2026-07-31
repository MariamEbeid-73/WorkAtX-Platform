# WorkX — Cross-Team Contracts

Single source of truth for the interfaces owned by **Task 2** (Job Creation, Profile Storage & AI-Facing Endpoints). Everyone else reads this instead of digging through code.

Status of the contracts:
- **Task C (Rana)** — worker consumes these jobs. Queue format verified end-to-end with a real Celery worker.
- **Task A (Faris)** — frontend reads `jobId`, polls `/status`, fetches `/result`, triggers `/analysis1/start`.
- **Task D (Mariam Alaa)** — writes `Stage`/`Progress` for `gap_analysis` jobs only.

---

## 1. Overview

Every incoming request — a chat message, an onboarding completion — becomes a **job** that travels through a lifecycle:

```
queued → processing → completed
                      └─→ failed  (with Error populated)
```

The job record is created first, **then** a message is published to the queue. This guarantees the record always exists before the worker can pick the message up.

---

## 2. Database

Migration: `AddJobTrackingAndAnalysis` (`20260731072756_AddJobTrackingAndAnalysis`).

### `Jobs` table

| Column        | Type               | Notes |
|---------------|--------------------|-------|
| `Id`          | `uuid` (PK)        | Job ID — surfaced as `jobId` to the frontend |
| `UserId`      | `uuid` (FK→Users)  | Owning user; cascade delete |
| `JobType`     | `varchar(32)`      | **Mutable.** `chat` → `gap_analysis` is the escalation |
| `Status`      | `varchar(32)`      | `queued` / `processing` / `completed` / `failed` |
| `PayloadJson` | `text`             | Raw input attached at creation (see §4) |
| `ResultJson`  | `text`             | Polymorphic output (see §4) |
| `Stage`       | `varchar(128)`     | Live progress stage for gap analyses (Task D writes) |
| `Progress`    | `integer`          | Live progress % for gap analyses (Task D writes) |
| `Error`       | `text`             | Failure reason when `Status = failed` |
| `CreatedAt`   | `timestamptz`      | Default `NOW()` |
| `UpdatedAt`   | `timestamptz`      | Default `NOW()` |

### `UserAnalyses` table

| Column        | Type          | Notes |
|---------------|---------------|-------|
| `UserId`      | `uuid` (PK, FK→Users) | One row per user |
| `ResultJson`  | `jsonb`       | Combined Analysis 1 result (CV + GitHub + LinkedIn) |
| `CreatedAt`   | `timestamptz` | Default `NOW()` |
| `UpdatedAt`   | `timestamptz` | Default `NOW()` |

### Constants

```text
JobType:   chat | gap_analysis | analysis1
JobStatus: queued | processing | completed | failed
```

---

## 3. Queue contract (BE → Celery worker)

The .NET backend publishes to **Redis** in **Kombu's format**, so the Celery worker needs **no custom consumer**.

- **Redis list:** `celery` (message pushed with `LPUSH`; Celery consumes with blocking `BRPOP`).
- **Task name:** `worker.tasks.process_job`, invoked as `process_job(jobId)` where `jobId` is a **string GUID**.
- **Message shape** (simplified):

```json
{
  "body": "<base64 of {\"args\": [], \"kwargs\": {\"jobId\": \"<guid>\"}, \"embed\": null}>",
  "headers": {
    "lang": "py",
    "task": "worker.tasks.process_job",
    "id": "<task-id>",
    "root_id": "<task-id>",
    "retries": 0
  },
  "properties": {
    "delivery_mode": 2,
    "delivery_info": { "exchange": "", "routing_key": "celery" },
    "body_encoding": "base64",
    "delivery_tag": "<task-id>"
  },
  "content-type": "application/json",
  "content-encoding": "utf-8"
}
```

**Watch-outs:**
- `headers.id` / `properties.delivery_tag` / `properties.correlation_id` must all be equal (Celery's ack mechanism).
- Key casing is significant: `content-type` / `content-encoding` (kebab-case), everything else inside `headers`/`properties` is snake_case (`root_id`, `delivery_tag`, ...).
- If the task name in the worker does **not** match `worker.tasks.process_job`, Celery logs `Received unregistered task of type 'worker.tasks.process_job'` and the job stalls. Keep the names in sync (or align the config — see §6).

**Worker responsibilities (Task C):** read the job by `jobId` from the DB, do the AI work, and write back:

| Event | Write |
|-------|-------|
| Started processing | `Status = processing` |
| Escalated to gap analysis | `JobType = gap_analysis` (same jobId, keep going) |
| Plain chat reply | `ResultJson = "<json string>"`, `Status = completed` |
| Final gap analysis | `ResultJson = <object>`, `Status = completed` |
| Failed (retries exhausted) | `Status = failed`, `Error = <reason>` |

Never leave a job stuck in `processing` — always resolve to `completed` or `failed`.

---

## 4. Payload & result shapes

### `PayloadJson` per job type

| JobType   | Payload |
|-----------|---------|
| `chat`    | `{ "userId": "<guid>", "message": "..." }` |
| `analysis1` | `{ "userId": "<guid>", "resumeFileId": "<guid>", "s3Key": "...", "fileName": "...", "contentType": "...", "githubUrl": "...?" , "linkedinUrl": "...?" }` |
| `gap_analysis` | Same as the `chat` job it escalated from (mutable in place) |

### `ResultJson` (polymorphic)

| JobType   | Result |
|-----------|--------|
| `chat` (plain reply) | a JSON-encoded **string**, e.g. `"\"Hello there\""` |
| `gap_analysis` | a full gap-analysis / study-plan **object** |
| `analysis1` | the combined profile-analysis **object** |

One column holds either shape — there is no per-job-type result schema.

---

## 5. HTTP endpoints

All endpoints except `/api/internal/*` require a **Clerk JWT** (`Authorization: Bearer <token>`). Errors come back as `{ "message": "..." }` via the exception middleware.

| Endpoint | Method | Auth | Returns |
|----------|--------|------|---------|
| `/api/chat/message` | POST | Clerk | `{ "jobId": "<guid>" }` |
| `/api/jobs/{id}/status` | GET | Clerk + ownership | status object (below) |
| `/api/jobs/{id}/result` | GET | Clerk + ownership | result object (below) |
| `/api/analysis1/start` | POST | Clerk | `{ "jobId": "<guid>" }` |
| `/api/internal/ai/context/{userId}` | GET | `X-Service-Token` | AI context (below) |

### `POST /api/chat/message`

Request: `{ "content": "..." }`

- **400** — empty/missing content.
- **429** — free-tier daily limit reached; body includes `retryAfterSeconds`.
- **Success** — returns only `{ jobId }`. **There is no reply in this response** — poll `/status` for the reply.

### `GET /api/jobs/{id}/status` — the frontend poll target

```json
{
  "jobId": "<guid>",
  "jobType": "chat",          // ← escalation signal: flips to "gap_analysis"
  "status": "queued",         // queued | processing | completed | failed
  "error": null,
  "stage": null,              // populated only for gap_analysis (Task D)
  "progress": null,           // populated only for gap_analysis (Task D)
  "updatedAt": "2026-07-31T..."
}
```

**Escalation:** when `jobType` becomes `"gap_analysis"`, the frontend should stop polling and switch to the live view (WebSocket).

### `GET /api/jobs/{id}/result`

```json
{
  "jobId": "<guid>",
  "jobType": "chat",
  "status": "completed",
  "result": "plain reply string" | { "...": "gap analysis / study plan object" },
  "error": null
}
```

### `POST /api/analysis1/start`

Onboarding-completion hook. Creates + queues an `analysis1` job automatically.

- **409** — no confirmed resume exists for the user (upload CV first).
- **Success** — `{ "jobId": "<guid>" }`, then poll the same `/status` endpoint.

### `GET /api/internal/ai/context/{userId}` (service-to-service)

- Auth: header `X-Service-Token: <token>` (configured via `ServiceAuth__Token`). **Not** a Clerk JWT — the AI service calls this directly and synchronously mid-processing.
- 401 without/with a bad token; 404 if the user has no Analysis 1 result yet.
- Fast: single indexed lookup keyed by `UserId`; does **not** depend on any job state.

```json
{
  "userId": "<guid>",
  "email": "...",
  "githubUrl": "...",
  "linkedinUrl": "...",
  "yearsOfExperience": 3,
  "techStack": ["..."],
  "degree": "...",
  "graduationYear": 2024,
  "analysis": { "...": "stored Analysis 1 result (over-inclusive)" },
  "analyzedAt": "2026-07-31T..."
}
```

### Ownership & errors

- `404` — job/analysis not found.
- `403` — the job exists but belongs to a different user.
- `401` — unauthenticated (missing/invalid Clerk JWT, or bad service token on internal routes).
- `429` — free-tier message limit reached.

---

## 6. Configuration

### Backend (.NET — `appsettings.*` / compose `be` env)

| Key | Default |
|-----|---------|
| `Redis:Configuration` | `redis:6379,abortConnect=false` |
| `Redis:CeleryTask` | `worker.tasks.process_job` |
| `Redis:CeleryQueue` | `celery` |
| `ServiceAuth:Token` | (required; compose default `dev-service-token`) |

### Worker (compose `worker` env)

| Key | Default |
|-----|---------|
| `CELERY_TASK` | `worker.tasks.process_job` |
| `CELERY_QUEUE` | `celery` |
| `SERVICE_AUTH_TOKEN` | `dev-service-token` |
| `DATABASE_URL` | Postgres connection (already wired) |

The task/queue names on the worker side **must match** the backend's `Redis__CeleryTask`/`Redis__CeleryQueue`.

---

## 7. Who owns what

| Concern | Owner |
|---------|-------|
| Create job records, publish queue messages | Task 2 (Mariam) |
| Serve `/status`, `/result`, `/analysis1/start`, `/internal/ai/context` | Task 2 (Mariam) |
| Consume queue messages, call AI, update `Status`/`JobType`/`ResultJson`/`Error` | Task C (Rana) |
| Write `Stage`/`Progress` for `gap_analysis` jobs; WebSocket pushes | Task D (Mariam Alaa) |
| Send chat messages, poll `/status`, fetch `/result`, call `/analysis1/start` | Task A (Faris) |

---

## 8. Known gaps / next steps

- **AI payload shape is not finalized.** `UserAnalyses.ResultJson` and the context endpoint are deliberately **over-inclusive** until the AI team confirms the exact Analysis 1 field contract. Once confirmed, the response can be trimmed — no schema change required.
- **WebSocket event contract** (Task D): stage list, per-event fields, and completion semantics still to be confirmed between AI team and Task D; `Stage`/`Progress` columns are ready.
- **Worker code does not exist yet** — `./Worker` (Task C) is pending and depends on §3.
