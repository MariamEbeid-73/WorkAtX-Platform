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

health_check() {
  local healthy=0
  for _ in $(seq 1 45); do
    if [[ "$(curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:5000/health || true)" == 200 ]]; then healthy=1; break; fi
    sleep 2
  done
  [[ "${healthy}" -eq 1 ]] || return 1
  docker exec workx-redis redis-cli ping | grep -qx PONG || return 1
  curl -fsS http://127.0.0.1:9000/minio/health/live >/dev/null || return 1
  curl -fsS http://127.0.0.1:8080/ >/dev/null || return 1
  docker inspect -f '{{.State.Running}}' workx-worker | grep -qx true || return 1
  if docker inspect workx-ai-app >/dev/null 2>&1; then
    docker exec workx-worker python3 -c "import urllib.request; assert urllib.request.urlopen('http://workx-ai-app:8000/health', timeout=5).status == 200" || return 1
  fi
}

rollback() {
  echo "Platform deployment failed; restoring previous images." >&2
  [[ "${had_previous}" -eq 1 ]] || { echo "No complete previous platform image set is available." >&2; return 1; }
  docker tag workx-be:rollback workx-be:latest
  docker tag workx-fe:rollback workx-fe:latest
  docker tag workx-worker:rollback workx-worker:latest
  "${compose[@]}" up -d --no-build
  health_check
}

if ! "${compose[@]}" up -d --no-build; then rollback || true; exit 6; fi
if ! health_check; then rollback; exit 7; fi

install -m 0644 "${DEPLOY_DIR}/nginx/workx.conf" /etc/nginx/sites-available/workx
if ! nginx -t; then rollback; exit 8; fi
systemctl reload nginx

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

