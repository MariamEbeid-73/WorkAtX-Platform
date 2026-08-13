#!/usr/bin/env bash
# Run as root on workx-staging. Pull and deploy one immutable WorkX image set.

set -euo pipefail

BE_IMAGE=""; FE_IMAGE=""; WORKER_IMAGE=""; SHA=""; BRANCH=""; BUILD_ID=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --be-image) BE_IMAGE="${2:-}"; shift 2 ;;
    --fe-image) FE_IMAGE="${2:-}"; shift 2 ;;
    --worker-image) WORKER_IMAGE="${2:-}"; shift 2 ;;
    --sha) SHA="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --build-id) BUILD_ID="${2:-}"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || { echo "remote-deploy.sh must run with sudo." >&2; exit 1; }
[[ "${SHA}" =~ ^[0-9a-fA-F]{40}$ ]] || { echo "Invalid full commit SHA." >&2; exit 2; }
[[ "${BRANCH}" =~ ^[A-Za-z0-9._/-]+$ ]] || { echo "Invalid branch label." >&2; exit 2; }
[[ "${BUILD_ID}" =~ ^[A-Za-z0-9._:-]+$ ]] || { echo "Invalid build ID." >&2; exit 2; }
PREFIX=me-central1-docker.pkg.dev/work-at-x/workx-images
[[ "${BE_IMAGE}" == "${PREFIX}/backend:${SHA}" ]] || { echo "Invalid backend image." >&2; exit 2; }
[[ "${FE_IMAGE}" == "${PREFIX}/frontend:${SHA}" ]] || { echo "Invalid frontend image." >&2; exit 2; }
[[ "${WORKER_IMAGE}" == "${PREFIX}/worker:${SHA}" ]] || { echo "Invalid worker image." >&2; exit 2; }

DEPLOY_DIR=/srv/workx/deploy/platform
CONFIG_DIR=/srv/workx/config/platform
STATE_DIR=/srv/workx/state/platform
FAILURE_DIR=/srv/workx/logs/deployments/platform
FAILURE_FILE="${FAILURE_DIR}/${BUILD_ID}.failure.log"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
CURRENT_STATE="${STATE_DIR}/current.env"
PREVIOUS_STATE="${STATE_DIR}/previous.env"
HISTORY_FILE="${STATE_DIR}/history.log"
REGISTRY=me-central1-docker.pkg.dev

exec 9>/var/lock/workx-deploy.lock
flock -n 9 || { echo "Another WorkX deployment is running. Try again after it finishes." >&2; exit 3; }

test -f "${COMPOSE_FILE}" || { echo "Missing platform Compose manifest." >&2; exit 4; }
test -f "${CONFIG_DIR}/.env" || { echo "Missing platform runtime .env." >&2; exit 4; }
test -f "${CONFIG_DIR}/staging.env" || { echo "Missing platform staging.env." >&2; exit 4; }
test -f "${DEPLOY_DIR}/nginx/workx.conf" || { echo "Missing nginx WorkX configuration." >&2; exit 4; }
install -d -m 0755 "${STATE_DIR}"
install -d -m 0700 "${FAILURE_DIR}"

for var in FE_PORT BE_PORT DB_PORT REDIS_PORT MINIO_API_PORT; do
  value="$(sed -n "s/^${var}=//p" "${CONFIG_DIR}/.env" | tail -1)"
  case "${value}" in 127.0.0.1:*|localhost:*) ;; *) echo "${var} must use a loopback binding." >&2; exit 4 ;; esac
done
for var in SERVICE_AUTH_TOKEN GITHUB_CLIENT_SECRET ENCRYPTION_KEY; do
  value="$(sed -n "s/^${var}=//p" "${CONFIG_DIR}/.env" | tail -1)"
  [[ -n "${value}" ]] || { echo "${var} must be set." >&2; exit 4; }
done

registry_logout() { docker logout "https://${REGISTRY}" >/dev/null 2>&1 || true; }
trap registry_logout EXIT
token="$({ curl -fsS -H 'Metadata-Flavor: Google' \
  'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token'; } | \
  python3 -c 'import json,sys; print(json.load(sys.stdin)["access_token"])')"
test -n "${token}" || { echo "Could not obtain a VM Artifact Registry token." >&2; exit 5; }
printf '%s' "${token}" | docker login -u oauth2accesstoken --password-stdin "https://${REGISTRY}" >/dev/null
unset token

for image in "${BE_IMAGE}" "${FE_IMAGE}" "${WORKER_IMAGE}"; do docker pull "${image}"; done

had_previous=1
for pair in 'workx-be:latest workx-be:rollback' 'workx-fe:latest workx-fe:rollback' 'workx-worker:latest workx-worker:rollback'; do
  read -r current rollback_tag <<<"${pair}"
  if docker image inspect "${current}" >/dev/null 2>&1; then docker tag "${current}" "${rollback_tag}"; else had_previous=0; fi
done
docker tag "${BE_IMAGE}" workx-be:latest
docker tag "${FE_IMAGE}" workx-fe:latest
docker tag "${WORKER_IMAGE}" workx-worker:latest

export WORKX_BE_IMAGE=workx-be:latest WORKX_FE_IMAGE=workx-fe:latest WORKX_WORKER_IMAGE=workx-worker:latest
compose=(docker compose --env-file "${CONFIG_DIR}/.env" --env-file "${CONFIG_DIR}/staging.env" -f "${COMPOSE_FILE}")

container_state() {
  local name="$1"
  if ! docker inspect "${name}" >/dev/null 2>&1; then
    echo "container=${name} state=missing"
    return 0
  fi
  docker inspect --format \
    'container={{.Name}} status={{.State.Status}} exit_code={{.State.ExitCode}} oom_killed={{.State.OOMKilled}} restart_count={{.RestartCount}} health={{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}} error={{json .State.Error}}' \
    "${name}" || true
  docker inspect --format \
    '{{if .State.Health}}{{range .State.Health.Log}}health_check start={{.Start}} exit={{.ExitCode}} output={{json .Output}}{{println}}{{end}}{{end}}' \
    "${name}" || true
}

bounded_container_logs() {
  local name="$1" lines="$2"
  echo "--- ${name}: latest ${lines} complete lines ---"
  if docker inspect "${name}" >/dev/null 2>&1; then
    docker logs --timestamps --tail="${lines}" "${name}" 2>&1 || true
  else
    echo "Container ${name} does not exist."
  fi
}

prune_failure_snapshots() {
  find "${FAILURE_DIR}" -maxdepth 1 -type f -name '*.failure.log' -mtime +14 -delete
  find "${FAILURE_DIR}" -maxdepth 1 -type f -name '*.failure.log' \
    -printf '%T@ %p\n' | sort -nr | tail -n +21 | cut -d' ' -f2- | \
    while IFS= read -r stale; do [[ -z "${stale}" ]] || rm -f -- "${stale}"; done
}

capture_failure_diagnostics() {
  local reason="$1"
  local append=0
  [[ -f "${FAILURE_FILE}" ]] && append=1
  umask 077
  {
    if [[ "${append}" -eq 1 ]]; then
      echo
      echo "===== ADDITIONAL FAILURE DIAGNOSTICS ====="
    else
      echo "===== PLATFORM DEPLOYMENT FAILURE ====="
      echo "build_id=${BUILD_ID}"
      echo "branch=${BRANCH}"
      echo "commit_sha=${SHA}"
    fi
    echo "timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "reason=${reason}"
    echo
    echo "--- Compose state ---"
    "${compose[@]}" ps -a || true
    echo
    echo "--- Container state and health checks ---"
    for name in workx-be workx-fe workx-worker workx-db workx-redis workx-minio workx-minio-init; do
      container_state "${name}"
    done
    echo
    bounded_container_logs workx-be 100
    bounded_container_logs workx-fe 100
    bounded_container_logs workx-worker 100
    bounded_container_logs workx-db 50
    bounded_container_logs workx-redis 50
    bounded_container_logs workx-minio 50
    bounded_container_logs workx-minio-init 50
    if [[ "${reason}" == *nginx* || "${reason}" == *Nginx* ]]; then
      echo "--- Host nginx configuration ---"
      nginx -t || true
      echo "--- Host nginx journal ---"
      journalctl -u nginx -n 50 --no-pager || true
      echo "--- Host nginx error log ---"
      tail -n 100 /var/log/nginx/error.log || true
    fi
  } 2>&1 | if [[ "${append}" -eq 1 ]]; then tee -a "${FAILURE_FILE}" >&2; else tee "${FAILURE_FILE}" >&2; fi || true
  chmod 0600 "${FAILURE_FILE}" 2>/dev/null || true
  prune_failure_snapshots || true
}

HEALTH_FAILURE_REASON=""

wait_for_http() {
  local url="$1" attempts="$2" delay_seconds="$3"
  for _ in $(seq 1 "${attempts}"); do
    if curl -fsS --max-time 5 "${url}" >/dev/null; then return 0; fi
    sleep "${delay_seconds}"
  done
  return 1
}

health_check() {
  HEALTH_FAILURE_REASON=""
  if ! wait_for_http http://127.0.0.1:5000/health 45 2; then HEALTH_FAILURE_REASON="Backend HTTP health check timed out"; return 1; fi
  if ! docker exec workx-redis redis-cli ping | grep -qx PONG; then HEALTH_FAILURE_REASON="Redis ping failed"; return 1; fi
  if ! curl -fsS http://127.0.0.1:9000/minio/health/live >/dev/null; then HEALTH_FAILURE_REASON="MinIO health check failed"; return 1; fi
  # nginx needs a short startup window after Compose recreates the frontend.
  # A one-shot probe races its entrypoint and can roll back a healthy release.
  if ! wait_for_http http://127.0.0.1:8080/ 30 1; then HEALTH_FAILURE_REASON="Frontend HTTP health check timed out"; return 1; fi
  if ! docker inspect -f '{{.State.Running}}' workx-worker | grep -qx true; then HEALTH_FAILURE_REASON="Worker container is not running"; return 1; fi
  if docker inspect workx-ai-app >/dev/null 2>&1; then
    if ! docker exec workx-worker python3 -c "import urllib.request; assert urllib.request.urlopen('http://workx-ai-app:8000/health', timeout=5).status == 200"; then
      HEALTH_FAILURE_REASON="Worker cannot reach the AI service"
      return 1
    fi
  fi
}

rollback() {
  echo "Platform deployment failed; restoring previous images." >&2
  [[ "${had_previous}" -eq 1 ]] || { echo "No complete previous platform image set is available." >&2; return 1; }
  docker tag workx-be:rollback workx-be:latest
  docker tag workx-fe:rollback workx-fe:latest
  docker tag workx-worker:rollback workx-worker:latest
  if ! "${compose[@]}" up -d --no-build; then
    echo "Could not recreate the previous platform containers." >&2
    return 1
  fi
  if ! health_check; then
    echo "Rollback health check failed: ${HEALTH_FAILURE_REASON}" >&2
    return 1
  fi
}

fail_with_rollback() {
  local exit_code="$1" reason="$2"
  capture_failure_diagnostics "${reason}" || true
  if ! rollback; then
    capture_failure_diagnostics "Rollback failed after: ${reason}" || true
    echo "Both the platform deployment and its automatic rollback failed." >&2
  fi
  echo >&2
  echo "Complete current logs: make logs" >&2
  echo "Follow worker logs:   make logs-follow SERVICE=worker TAIL=200" >&2
  echo "Saved failure:        make logs-failure BUILD_ID=${BUILD_ID}" >&2
  exit "${exit_code}"
}

if ! "${compose[@]}" up -d --no-build; then
  fail_with_rollback 6 "Platform containers failed to start"
fi
if ! health_check; then
  fail_with_rollback 7 "${HEALTH_FAILURE_REASON:-Platform health check failed}"
fi

install -m 0644 "${DEPLOY_DIR}/nginx/workx.conf" /etc/nginx/sites-available/workx
if ! nginx -t; then
  fail_with_rollback 8 "Nginx configuration validation failed"
fi
if ! systemctl reload nginx; then
  fail_with_rollback 9 "Nginx reload failed"
fi

tmp_state="$(mktemp "${STATE_DIR}/current.XXXXXX")"
{
  printf 'SERVICE=platform\nBRANCH=%s\nCOMMIT_SHA=%s\nBUILD_ID=%s\n' "${BRANCH}" "${SHA}" "${BUILD_ID}"
  printf 'BE_IMAGE=%s\nFE_IMAGE=%s\nWORKER_IMAGE=%s\n' "${BE_IMAGE}" "${FE_IMAGE}" "${WORKER_IMAGE}"
  printf 'DEPLOYED_AT=%s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
} > "${tmp_state}"
if [[ -f "${CURRENT_STATE}" ]]; then cp -f "${CURRENT_STATE}" "${PREVIOUS_STATE}"; fi
mv -f "${tmp_state}" "${CURRENT_STATE}"
printf '%s service=platform branch=%s sha=%s build=%s\n' \
  "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "${BRANCH}" "${SHA}" "${BUILD_ID}" >> "${HISTORY_FILE}"
echo "Platform deployment succeeded: ${SHA}"
