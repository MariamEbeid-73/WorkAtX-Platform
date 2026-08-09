# WorkX — Cross-Team Contracts

Single source of truth for the interfaces owned by **Task 2** (Job Creation, Profile Storage & AI-Facing Endpoints). Everyone else reads this instead of digging through code.

Status of the contracts:
- **Task C (Rana)** — worker consumes these jobs (queue format verified end-to-end with a real Celery worker) and drives them entirely over the internal HTTP endpoints — **no DB access**.
- **Task A (Faris)** — CV upload auto-triggers parsing (no analysis call needed). Frontend reads `jobId` from confirm, polls `/status`, fetches `/result`, reads scores from `/api/profile/scores`.
- **Task D (Mariam Alaa)** — writes `Stage`/`Progress` for `gap_analysis` jobs only.

---

## 1. Overview

Every incoming request — a chat message, an onboarding CV confirm — becomes a **job** that travels through a lifecycle:

```
queued → processing → completed
                      └─→ failed  (with Error populated)
```

The job record is created first, **then** a message is published to the queue. This guarantees the record always exists before the worker can pick the message up.

**Analysis 1 is fully automatic:** confirming a CV upload creates + queues an `analysis1` job with **no user action** (and no frontend call). Parsing happens regardless of whether the user ever asks a question. If the user uploads a new CV later, the previous analysis is marked stale and a re-parse is queued.

---

## 2. Database

Migrations: `AddJobTrackingAndAnalysis` (`20260731072756_...`) and `AddAnalysisStalenessAndProfileScores` (`20260731095004_...`).

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
| `ResumeFileId`| `uuid` (FK→ResumeFiles, `SET NULL`) | Resume this analysis was parsed from; drives re-parse detection |
| `IsStale`     | `boolean`     | `true` once a newer CV is confirmed while this result is in flight |
| `CreatedAt`   | `timestamptz` | Default `NOW()` |
| `UpdatedAt`   | `timestamptz` | Default `NOW()` |

Staleness rules:
- Confirming a **new** CV sets `IsStale = true` on the old row and queues a re-parse.
- The AI context endpoint returns **404** while `IsStale` is true — a superseded result is treated as "no analysis".
- The backend's `POST /api/internal/ai/jobs/{jobId}/result` clears the flag when the fresh parse lands: it writes `ResumeFileId` (from the job payload) and `IsStale = false`. **The worker never touches the DB.**

### `ProfileScores` table

| Column          | Type      | Notes |
|-----------------|-----------|-------|
| `UserId`        | `uuid` (PK, FK→Users) | One row per user |
| `BreakdownJson` | `jsonb`   | Score breakdown — camelCase shape of the frontend's `ScoreBreakdown` type |
| `CreatedAt`     | `timestamptz` | Default `NOW()` |
| `UpdatedAt`     | `timestamptz` | Default `NOW()` |

`BreakdownJson` shape (mirrors FE `FE/src/types/profile.ts` → `ScoreBreakdown`):

```json
{
  "overall": { "overallShowoff": {...ScoreMetric}, "resume": {...}, "github": {...} },
  "dev":     { "overallShowoff": {...}, "resume": {...}, "github": {...} },
  "aiml":    { "overallShowoff": {...}, "resume": {...}, "github": {...} }
}
```

Where `ScoreMetric = { "label": "...", "value": 0-100, "trend": 0|null, "lastUpdated": "...?" }`.
The dashboard's `ScoreBreakdownCard` renders `data: null` (not computed yet) with fallback values — **do not 404** when the row is missing.

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

**Worker responsibilities (Task C):** the worker is **AI-only and stateless — it has no DB access.** It consumes the queue message (jobId), then drives the job entirely over HTTP:

1. `GET /api/internal/ai/jobs/{jobId}` → full job + decoded payload.
2. `GET /api/internal/ai/resume/{resumeFileId}/download-url` → pre-signed CV URL (analysis1 jobs).
3. `POST /api/internal/ai/jobs/{jobId}/status` with `{ "status": "processing" }` → marks the job `processing`; escalate with `{ "jobType": "gap_analysis" }`.
4. `GET /api/internal/ai/context/{userId}` → user + stored analysis context.
5. `POST /api/internal/ai/jobs/{jobId}/result` with `{ "status": "completed", "resultJson": "<json>" }` or `{ "status": "failed", "error": "<reason>" }` → **the backend** routes and stores the result.

**The backend (Task 2) owns ALL writes.** `Jobs`, `UserAnalyses`, `ProfileScores`, and parsed `Users` fields are mutated only server-side. The worker returns JSON; Task 2 stores it.

**Analysis 1 completion (backend-side, via `/result`):**
1. Worker parses the CV (from the pre-signed download URL) + GitHub/LinkedIn, and POSTs the combined result as `resultJson`.
2. The backend upserts `UserAnalyses` by `UserId`: `ResultJson = resultJson`, `ResumeFileId` = the analysis1 payload's `resumeFileId`, `IsStale = false`.
3. The job is marked `completed`. Extracting `ProfileScores` / parsed `Users` fields from the result is a **separate concern** (score mapping is out of Task 2's scope) and waits on the AI team's field contract (§8).

Never leave a job stuck in `processing` — always resolve to `completed` or `failed`.

---

## 4. Payload & result shapes

### `PayloadJson` per job type

| JobType   | Payload |
|-----------|---------|
| `chat`    | `{ "userId": "<guid>", "message": "..." }` |
| `analysis1` | `{ "userId": "<guid>", "resumeFileId": "<guid>", "s3Key": "...", "fileName": "...", "contentType": "...", "githubUrl": "...?" , "linkedinUrl": "...?" }` |
| `gap_analysis` | Same as the `chat` job it escalated from (mutable in place) |

`analysis1` jobs are created automatically by `POST /resumes/{id}/confirm` (one active parse per user at a time — if a job for the same resume is already `queued`/`processing`, it is reused instead of duplicated).

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
| `/api/analysis1/latest` | GET | Clerk | `ApiResponse<result|null>` — last completed Analysis 1 result from the DB; never queues a job. `data` is `null` when none exists yet or the stored result is stale |
| `/api/analysis1/state` | GET | Clerk | `ApiResponse<{ analysis, activeJob }>` — authoritative persisted result plus the newest queued/processing Analysis 1 job; never queues a job |
| `/resumes/{id}/confirm` | POST | Clerk | `{ "resume": {...}, "analysisJobId": "<guid>|null" }` |
| `/api/profile/scores` | GET | Clerk | score breakdown or `data: null` |
| `/api/plans` | GET | Clerk | all persisted study plans for the current user, newest first |
| `/api/plans/{id}` | GET | Clerk + ownership | one persisted study plan and its progress |
| `/api/plans/{id}/progress` | PUT | Clerk + ownership | validates and replaces task/week completion state |
| `/api/internal/ai/context/{userId}` | GET | `X-Service-Token` | AI context (below) |
| `/api/internal/ai/jobs/{jobId}` | GET | `X-Service-Token` | full job + decoded payload |
| `/api/internal/ai/resume/{resumeFileId}/download-url` | GET | `X-Service-Token` | `{ "url", "expiresAt" }` |
| `/api/internal/ai/jobs/{jobId}/status` | POST | `X-Service-Token` | updated job view |
| `/api/internal/ai/jobs/{jobId}/result` | POST | `X-Service-Token` | `{ "id", "status" }` |

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

Manual "re-run analysis" endpoint (also the original onboarding-completion hook). Creates + queues an `analysis1` job using the user's latest confirmed resume.

- **409** — no confirmed resume exists for the user (upload CV first).
- **Success** — `{ "jobId": "<guid>" }`, then poll the same `/status` endpoint.
- **Note:** with auto-trigger on confirm, the frontend no longer needs to call this during onboarding. It exists for manual refresh / retry.

### `GET /api/analysis1/state`

Read-only restore endpoint for the Knowledge Graph. It never creates or queues
a job. `activeJob` uses the same shape as `GET /api/jobs/{id}/status`.

```json
{
  "success": true,
  "message": null,
  "data": {
    "analysis": { "profileAnalysis": {}, "scoreBreakdown": {} },
    "activeJob": {
      "jobId": "<guid>",
      "jobType": "analysis1",
      "status": "processing",
      "error": null,
      "stage": "Analysing profile",
      "progress": 45,
      "updatedAt": "2026-08-09T..."
    }
  }
}
```

- `analysis` is `null` when no non-stale result exists.
- `activeJob` is `null` when no Analysis 1 job is queued or processing.
- When both exist during a manual re-analysis, the frontend resumes the active
  job and renders the newly persisted result after completion.

### `POST /resumes/{id}/confirm`

Step 2 of the CV upload flow. Marks the resume confirmed **and automatically creates + queues the `analysis1` parse job** — no frontend analysis call needed.

```json
{
  "resume": {
    "id": "<guid>", "fileName": "...", "contentType": "...",
    "sizeBytes": 1234, "uploadedAt": "2026-07-31T..."
  },
  "analysisJobId": "<guid>"
}
```

- `analysisJobId` is present when a parse was created (new or changed resume).
- `analysisJobId` is `null` when this exact resume was already parsed (idempotent re-confirm) — the frontend can then skip the progress view.
- Frontend can poll `GET /api/jobs/{analysisJobId}/status` for real parse progress instead of a fake spinner.

### `GET /api/profile/scores`

Returns the score breakdown for the current user. `data` is `null` until the AI worker writes the score row — render fallbacks, do not error.

### Study plan endpoints

Completed AI responses with `responseType: "study_plan"` are stored in
`UserStudyPlans`. `GET /api/plans` exposes those records to the owning user;
the raw generated payload is returned as `plan`, alongside the database `id`,
originating `jobId`/`sessionId`, timestamps, and a separate `progress` object.

`PUT /api/plans/{id}/progress` accepts:

```json
{
  "completedWeekIndexes": [0],
  "completedTaskIndexes": { "0": [0, 1, 2] }
}
```

Indexes are zero-based and validated against the immutable AI payload. A week
cannot be completed until every task in that week is completed. Plan payloads
must use the AI envelope `{ "responseType": "study_plan", "response": {
"title": "...", "summary": "...", "weeks": [...] } }`; the worker rejects an
empty/malformed `response.weeks` result instead of persisting an unusable plan.

### `GET /api/internal/ai/context/{userId}` (service-to-service)

- Auth: header `X-Service-Token: <token>` (configured via `ServiceAuth__Token`). **Not** a Clerk JWT — the AI service calls this directly and synchronously mid-processing.
- 401 without/with a bad token; 404 if the user has no Analysis 1 result **or the result is stale** (a re-parse is in flight — do not mix a superseded analysis into a new parse).
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

### `GET /api/internal/ai/jobs/{jobId}` (service-to-service)

- Auth: `X-Service-Token` header.
- Returns the full job + decoded payload. **This is the worker's entry point** — the queue message only carries the `jobId`.
- 404 if the job doesn't exist.

```json
{
  "id": "<guid>",
  "jobType": "analysis1",
  "status": "queued",
  "payload": { "userId": "...", "resumeFileId": "...", "s3Key": "...", "githubUrl": "...", "linkedinUrl": "..." },
  "createdAt": "2026-07-31T...",
  "updatedAt": "2026-07-31T..."
}
```

### `GET /api/internal/ai/resume/{resumeFileId}/download-url` (service-to-service)

- Auth: `X-Service-Token` header.
- Returns a short-lived pre-signed GET URL (1h) so the worker can download the CV directly from MinIO/S3 — no storage credentials needed.
- 404 if the resume file doesn't exist.

```json
{ "url": "https://.../resumes/...?...", "expiresAt": "2026-07-31T..." }
```

### `POST /api/internal/ai/jobs/{jobId}/status` (service-to-service)

- Auth: `X-Service-Token` header.
- Body: `{ "status": "processing", "jobType": "gap_analysis" }` — `jobType` is optional and only legal on a `chat` job (flips it to `gap_analysis`).
- Returns the updated job view (same shape as `GET /jobs/{jobId}`).
- Errors: 400 on an unsupported status or illegal escalation; 404 unknown job; 409 job already terminal.
- **Does not touch `Stage`/`Progress`** — those are owned by the Redis stream consumer (Task D).

### `POST /api/internal/ai/jobs/{jobId}/result` (service-to-service)

- Auth: `X-Service-Token` header.
- Body: `{ "status": "completed", "resultJson": "<json string>" }` or `{ "status": "failed", "error": "<reason>" }`.
- **The backend owns the routing:**
  - `analysis1` completed → upserts `UserAnalyses` (`ResultJson`, `ResumeFileId` from payload, `IsStale = false`) and marks the job `completed`.
  - `chat`/`gap_analysis` completed → `Jobs.ResultJson`, job `completed`; failed → `Jobs.Error`, job `failed`.
- Errors: 400 missing `resultJson`/`error`; 404 unknown job; **409 double-submit** on an already-terminal job.

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
| Auto-trigger `analysis1` on CV confirm; staleness (re-parse) logic | Task 2 (Mariam) |
| Serve `/status`, `/result`, `/analysis1/start`, `/internal/ai/context`, `/internal/ai/jobs/*`, `/internal/ai/resume/*`, `/profile/scores` | Task 2 (Mariam) |
| **All** DB writes — `Jobs`, `UserAnalyses`, `ProfileScores`, parsed `Users` fields. The worker has no DB access and reports results over HTTP | Task 2 (Mariam) |
| Consume queue messages, do the AI work, report progress + results via the internal HTTP endpoints | Task C (Rana) |
| Write `Stage`/`Progress` for `gap_analysis` jobs; WebSocket pushes | Task D (Mariam Alaa) |
| Send chat messages, poll `/status`, fetch `/result`; read `/profile/scores`; poll `analysisJobId` from confirm | Task A (Faris) |

---

## 8. Known gaps / next steps

- **AI payload shape is not finalized.** `UserAnalyses.ResultJson`, `ProfileScores.BreakdownJson`, and the context endpoint are deliberately **over-inclusive** until the AI team confirms the exact Analysis 1 field contract. Once confirmed, the response can be trimmed — no schema change required.
- **WebSocket event contract** (Task D): stage list, per-event fields, and completion semantics still to be confirmed between AI team and Task D; `Stage`/`Progress` columns are ready.
- **Worker code does not exist yet** — `./Worker` (Task C) is pending and depends on §3 + the internal endpoints in §5 (job fetch, resume download, status, result). Until then, `analysis1`/`chat` jobs stay `queued` (no consumer).
- **Score mapping is out of Task 2's scope** — `ProfileScores.BreakdownJson` and parsed `Users` fields are not derived by the result endpoint yet; they're owned elsewhere and wait on the AI team's field contract.
- **LinkedIn data is minimal** — current OAuth scope (`openid profile email`) returns only name/email/sub, and `Users.LinkedinUrl` holds the display *name*, not a URL. Treat LinkedIn as name/email-only until richer scopes are obtainable.
- **`analysis1/start` is now redundant for onboarding** (auto-triggered by confirm) — kept as a manual re-run hook. Confirm with Task A that nothing calls it during onboarding anymore.
