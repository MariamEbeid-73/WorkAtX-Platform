#!/usr/bin/env bash
# Print a read-only snapshot of jobs executing or waiting on workx-staging.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"

usage() {
  cat <<'EOF'
Usage: scripts/jobs_status.sh

Reports:
  - active and reserved Celery tasks
  - messages waiting in the Redis Celery queue
  - queued/processing rows in the backend Jobs table
  - queued/running rows in the AI research_jobs table

This command is read-only and targets workx-staging by default. The standard
WORKX_GCP_* and WORKX_VM_* deployment variables can select another target.
EOF
}

case "${1:-}" in
  "") ;;
  -h|--help) usage; exit 0 ;;
  *) workx_fail "Unknown option: $1" ;;
esac
[[ $# -le 1 ]] || workx_fail "This command does not accept positional arguments."

workx_gcloud_init
trap workx_gcloud_cleanup EXIT

# Feeding a quoted script over stdin avoids interpolating SQL, Python, or
# container environment values on the operator's machine.
workx_ssh --command="sudo bash -s" <<'REMOTE_SCRIPT'
set -u

is_running() {
  [[ "$(docker inspect --format '{{.State.Running}}' "$1" 2>/dev/null || true)" == "true" ]]
}

section() {
  printf '\n%s\n' "$1"
  printf '%s\n' '----------------------------------------'
}

printf 'WorkX deployed jobs snapshot\n'
printf 'Server time: %s\n' "$(date --iso-8601=seconds)"

section "Celery worker and Redis queue"
if ! is_running workx-worker; then
  printf 'Worker inspection unavailable: workx-worker is not running.\n'
elif ! is_running workx-redis; then
  printf 'Worker inspection unavailable: workx-redis is not running.\n'
else
  docker exec -i workx-worker python - <<'PYTHON'
import os
from datetime import datetime, timezone

import redis
from celery_app import app


def flatten(per_worker):
    return [task for tasks in (per_worker or {}).values() for task in tasks]


inspection_error = None
try:
    inspector = app.control.inspect(timeout=5)
    active = flatten(inspector.active() or {})
    reserved = flatten(inspector.reserved() or {})
except Exception as exc:
    inspection_error = f"{type(exc).__name__}: {exc}"
    active = []
    reserved = []

queue_name = os.getenv("CELERY_QUEUE", "celery")
try:
    waiting = redis.Redis.from_url(os.environ["REDIS_URL"]).llen(queue_name)
except Exception as exc:
    waiting = f"unavailable ({type(exc).__name__}: {exc})"

print(f"Active tasks:       {len(active) if inspection_error is None else 'unavailable'}")
print(f"Reserved tasks:     {len(reserved) if inspection_error is None else 'unavailable'}")
print(f"Waiting in Redis:   {waiting}")

if inspection_error is not None:
    print(f"Verdict:            unavailable (inspection failed: {inspection_error})")
elif len(active) > 1:
    print("Verdict:            YES - multiple jobs are executing concurrently.")
elif len(active) == 1:
    print("Verdict:            NO - one job is executing.")
else:
    print("Verdict:            NO active jobs were reported.")

if active:
    print("\nActive task details:")
    for task in sorted(active, key=lambda item: item.get("time_start") or 0):
        kwargs = task.get("kwargs") or {}
        job_id = kwargs.get("jobId") or kwargs.get("job_id") or "unknown"
        started_raw = task.get("time_start")
        if started_raw:
            started = datetime.fromtimestamp(started_raw, timezone.utc).isoformat(timespec="seconds")
        else:
            started = "unknown"
        print(
            f"  job_id={job_id} pid={task.get('worker_pid', 'unknown')} "
            f"started={started} task={task.get('name', 'unknown')}"
        )
PYTHON
fi

section "Backend jobs (queued or processing)"
if ! is_running workx-db; then
  printf 'Backend job query unavailable: workx-db is not running.\n'
else
  docker exec -i workx-db sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' <<'SQL'
SELECT
    "Id" AS job_id,
    "JobType" AS type,
    "Status" AS status,
    COALESCE("Stage", '-') AS stage,
    COALESCE("Progress"::text, '-') AS progress,
    NOW() - "UpdatedAt" AS since_update
FROM "Jobs"
WHERE "Status" IN ('queued', 'processing')
ORDER BY "CreatedAt";
SQL
fi

section "AI research jobs (queued or running)"
if ! is_running workx-ai-postgres; then
  printf 'AI research query unavailable: workx-ai-postgres is not running.\n'
else
  docker exec -i workx-ai-postgres sh -c 'exec psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -P pager=off' <<'SQL'
SELECT
    id AS research_job_id,
    company_key,
    COALESCE(role, '-') AS role,
    status,
    completed_batches || '/' || total_batches AS batches,
    NOW() - updated_at AS since_update
FROM research_jobs
WHERE status IN ('QUEUED', 'RUNNING')
ORDER BY created_at;
SQL
fi
REMOTE_SCRIPT
