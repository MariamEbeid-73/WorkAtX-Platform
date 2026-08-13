# WorkX Worker — Guide

Python 3.11 Celery worker that does the AI work for the async job pipeline. **It has no database access** — it consumes queue messages and drives jobs purely over the BE internal HTTP API. See root `AGENTS.md` + `CONTRACTS.md` for the pipeline contract.

## Run & test

```sh
# Local worker (needs Redis + BE running):
pip install -r requirements.txt
celery -A celery_app worker --loglevel=info

# Tests (fully mocked — no Redis, no BE, no AI service needed):
pip install -r requirements.txt pytest
pytest tests/ -v
```

- Docker: root `./startup.sh` builds `workx-worker` (Dockerfile sets `PYTHONPATH=/app`, `CMD celery -A celery_app worker --loglevel=info`).
- Note: `tests/test_failure_injection.py`'s docstring references `requirements-dev.txt`, which **does not exist** — just `pip install pytest`.
- `Worker/tests/read_progress_stream.py` / `send_test_job.py` are manual debugging scripts (require live Redis + BE).

## Flow

`celery_app.py` — Celery app, broker + result backend = `REDIS_URL` (default `redis://localhost:6379/0`), `include=["tasks.process_job"]`, config: `acks_late`, `reject_on_worker_lost`, `prefetch_multiplier=1`.

`tasks/process_job.py` — the only registered task, name **`worker.tasks.process_job`** (must match BE `Redis__CeleryTask` / compose `CELERY_TASK`). Dispatcher:
1. `GET /api/internal/ai/jobs/{jobId}` → job details (queue message only carries the jobId)
2. `POST /api/internal/ai/jobs/{jobId}/status` with `processing`
3. Route by `jobType`: `chat` → `handle_chat`, `analysis1` → `handle_analysis_1`
4. POST result back via `/api/internal/ai/jobs/{jobId}/result` (`completed` + `resultJson`, or `failed` + `error`)

Retry policy: `max_retries=3`, exponential backoff `5 * 2^retries`, `soft_time_limit=1860`/`time_limit=1920` (derived from ai_client's configurable 1800s default). 4xx from BE is fatal; 5xx/connect failures retry then dead-letter. A read timeout is terminal because the AI server may still be executing the accepted request, so retrying would duplicate the same job. Never leave a job stuck in `processing` — `_safe_submit_failed_status` always resolves terminal failures.

## Modules

- `app/backend_client.py` — HTTP client to BE, reads `SERVICE_AUTH_TOKEN` (matches compose/`.env.development`).
- `app/ai_client.py` — calls the real AI service at `AI_SERVICE_BASE_URL` (default `http://host.docker.internal:8000`; compose sets the same via `extra_hosts: host.docker.internal`), sending `X-Service-Token: $SERVICE_AUTH_TOKEN` — the AI service's `/api/v1/ai/*` routes constant-time-compare against the same shared secret `backend_client.py` uses for calls the other direction. **`MOCK_AI=true` by default** — returns canned `chat`/`gap_analysis`/`study_plan`/`analysis1` responses so the whole pipeline runs with no AI backend. Set `MOCK_AI=false` to hit the real service.
- `progress_publisher.py` — `XADD`s `{job_id, stage, percent}` to the Redis stream `job-progress-stream`. The BE `JobProgressStreamConsumer` turns these into DB updates + SignalR pushes. `stage` text is treated as opaque by BE — keep it user-friendly.
- `tasks/chat_job.py`, `tasks/analysis1_job.py` — per-job-type handlers (download CV from a BE-issued pre-signed MinIO URL, submit profile scores, etc.).

## Gotchas

- Never import `app.`/`tasks.` without `PYTHONPATH=/app` (Dockerfile sets it; locally run from the `Worker/` dir).
- The Dockerfile HEALTHCHECK references `health_check.py` which **does not exist** — compose overrides the healthcheck with `celery -A celery_app inspect ping`, so the build/run is unaffected, but don't "fix" the missing file without checking compose.
- Add a new job type → add a handler in `tasks/`, register the routing in `process_job.py`, and extend the contract in `CONTRACTS.md` (and note the result shape is polymorphic in one `ResultJson` column).
- Worker timeouts must stay under the BE/internal limits — the analysis endpoint uses its own 60s timeout on the parse call.
