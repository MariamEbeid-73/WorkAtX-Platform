# AI Service Integration — Report for the work@x team

Everything found and fixed while wiring the AI service (`Ai-career-service`) into this repo, on branch `last-touch`. Diffs are in that branch; this document explains what was wrong and why.

## Contract mismatches (blocking — nothing worked without these)

The flow doc originally shared with the AI team described `staging-deployment`'s contract. `main` had already moved on:

| Field | `staging-deployment` | `main` (current) |
|---|---|---|
| Discriminator | `response_type` | `responseType` |
| Values | `general_message` / `gap_analysis_result` / `study_plan_result` | `normal_text` / `gap_analysis` / `study_plan` |
| Session scoping | none (`GetGapAnalysis(userId)`) | `?sessionId=` on gap-analysis/plan lookups |
| `ai_client.call_process_api` | `(user_id, job_id, message, timeout)` | adds `session_id`, `context_summary` |

The AI service now emits **both** spellings in its response envelope (`responseType` and `response_type`, `reply` at root and inside `response`) specifically because these two branches disagree and we couldn't be sure which was live until inspecting the VM directly (it turned out to be `staging-deployment`, deployed non-git via a build artifact — no `.git` directory on the box at all).

## Bugs found and fixed on `last-touch`

1. **`Worker/app/ai_client.py` never sent the AI service's required auth header.** `backend_client.py` (worker → your BE) sends `X-Service-Token`; `ai_client.py` (worker → AI service) sent nothing at all. Every real call would have 401'd the moment `MOCK_AI=false`. Fixed: reads `SERVICE_AUTH_TOKEN` (same env var, same secret, both directions) and sends it.
2. **Timeouts too short for a real scrape.** `ai_client.py` timeout 90s → 300s; `process_job.py`'s Celery `soft_time_limit`/`time_limit` 120/130 → 330/360 (must exceed ai_client's own timeout or Celery kills the task first); `analysis1_job.py`'s `TIMEOUT_ANALYSIS_1` 60s → 120s (CV parsing runs `gemini-2.5-pro` plus live GitHub/LinkedIn scraping); FE's `jobService.ts` `POLL_TIMEOUT_MS` 120s → 370s (must exceed the worker's own ceiling or the UI gives up first).
3. **Tech-choices resume path always sent `message=None`.** `ChatSessionController.SubmitTechChoices` creates a job with `{resumeFromJobId, selections}` and no `message` — `chat_job.py` read `payload.get("message")` unconditionally, so this call was never going to produce a sensible AI response. Fixed: when `message` is absent and `selections` is present, synthesize one from the already-resolved `{category: option}` picks (`selections` is a flat dict the frontend already resolved — see `FE/src/types/chat.ts TechChoiceSelections` — so there's nothing to parse, only something to say). **Known residual gap**: the synthesized message doesn't carry *which* job the original analysis resolved to (`resumeFromJobId` is a job id, not a role_id/track_id) — if that analysis covered more than one job, the AI service may ask the user to pick again instead of assuming. Safe degradation (one extra turn), not a wrong answer, but worth threading through properly if it comes up often.
4. **`Worker/AGENTS.md` documented a bug that no longer exists.** It claimed `backend_client.py` reads `SERVICE_TOKEN` while compose sets `SERVICE_AUTH_TOKEN` — the code already reads `SERVICE_AUTH_TOKEN` correctly. Doc corrected, and the real `ai_client.py` auth gap (bug 1) documented in its place.
5. **No `restart:` policy anywhere in `docker-compose.yml`.** Nothing survives a VM reboot today. Added `restart: unless-stopped` to every long-running service, `restart: "no"` to the one-shot `minio-init`.
6. **Two live secrets committed in the clear.** `GITHUB_CLIENT_SECRET` and `ENCRYPTION_KEY` had real-looking values baked into `docker-compose.yml`'s `${VAR:-default}` fallback on `main`; a third, `LINKEDIN_CLIENT_SECRET`, only on `staging-deployment`. **These are compromised and should be rotated** — removing the fallback (now `${VAR:?...}`, fails loud instead of silently reusing them) stops *future* runs from depending on them, but doesn't erase them from git history, which anyone with repo access can still read. On the live VM, the currently-live GitHub/LinkedIn secret values were preserved by moving them into the VM's `.env` (gitignored) rather than rotated blind — rotating requires updating the GitHub/LinkedIn OAuth app configs at the same time, which needs someone with access to those apps, not something to do unattended mid-deploy.
7. **Five `HOST:PORT` overrides existed only on `staging-deployment`, never merged to `main`.** `FE_PORT`, `BE_PORT`, `DB_PORT`, `REDIS_PORT`, `MINIO_API_PORT` — all `host_ip:port`-shaped (e.g. `127.0.0.1:5432`) on the deployed VM's `.env`, all silently ignored by `main`'s plain `"5432:5432"`-style bindings. Deploying `main`-derived code with the loopback pattern dropped is exactly the SSRF/exposure risk `main`'s own `is_public_https_url` guard elsewhere in this codebase exists to prevent — **this one actually happened**: deploying `last-touch` (main + fixes) briefly exposed Postgres, Redis, the BE API, and MinIO's API port on the VM's public IP, confirmed with an external TCP probe, before being caught and fixed within the same session. Fixed by restoring the `${VAR:-default}` pattern for all five. MinIO's console port (9001) has no `host_ip` prefix even on staging — pre-existing, left as-is.

## What's intentionally *not* changed

- **`LINKEDIN_CLIENT_ID/Secret/RedirectUri` were not added to `main`'s compose.** Checked: `main`'s BE code has no LinkedIn OAuth controller or config read (`OAuth:LinkedIn:*` is never bound) — only GitHub OAuth is implemented. Adding those env vars would be inert config for a feature that doesn't exist on this branch.
- **The `staging-deployment`/`main` divergence itself.** `last-touch` branches from `main`; it does not attempt to reconcile everything `staging-deployment` added independently (only the pieces that were actively causing breakage or an active exposure were pulled forward — the two `HOST:PORT` and secret-handling items above).

## Recommended follow-ups (not done here — need your call)

- **Rotate** `GITHUB_CLIENT_SECRET`, `ENCRYPTION_KEY`, and `LINKEDIN_CLIENT_SECRET`. `ENCRYPTION_KEY` in particular encrypts OAuth tokens at rest — rotating it invalidates existing stored tokens, so plan for re-auth.
- Decide whether `staging-deployment`'s other divergences (LinkedIn OAuth flow, the async-mock-progress simulation in its `ai_client.py`) should be ported to `main`, or whether `main` deliberately superseded them.
- The VM had no `.git` at all — deploys land via a build artifact, not a live clone. Worth deciding on an actual deploy pipeline (even a simple `git pull && docker compose build` over SSH) so "which commit is live" is answerable without diffing file contents against every branch by hand.
