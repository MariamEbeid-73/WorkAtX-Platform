#!/usr/bin/env bash
# Run as root on workx-staging. Read platform Compose or deployment-failure logs.

set -euo pipefail

SERVICE=""
TAIL="all"
FOLLOW=0
MODE="docker"
BUILD_ID=""

select_mode() {
  [[ "${MODE}" == docker ]] || { echo "Logging modes cannot be combined." >&2; exit 2; }
  MODE="$1"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service) [[ $# -ge 2 && -n "$2" ]] || { echo "--service requires a value." >&2; exit 2; }; SERVICE="$2"; shift 2 ;;
    --tail) [[ $# -ge 2 && -n "$2" ]] || { echo "--tail requires a value." >&2; exit 2; }; TAIL="$2"; shift 2 ;;
    --follow) FOLLOW=1; shift ;;
    --list-services) select_mode services; shift ;;
    --list-failures) select_mode failures; shift ;;
    --failure) [[ $# -ge 2 && -n "$2" ]] || { echo "--failure requires a build ID." >&2; exit 2; }; select_mode failure; BUILD_ID="$2"; shift 2 ;;
    *) echo "Unknown option: $1" >&2; exit 2 ;;
  esac
done

[[ "${EUID}" -eq 0 ]] || { echo "remote-logs.sh must run with sudo." >&2; exit 1; }
[[ "${TAIL}" == all || "${TAIL}" =~ ^[0-9]+$ ]] || {
  echo "TAIL must be 'all' or a non-negative integer." >&2
  exit 2
}
[[ -z "${SERVICE}" || "${SERVICE}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || {
  echo "SERVICE contains unsupported characters." >&2
  exit 2
}
[[ -z "${BUILD_ID}" || "${BUILD_ID}" =~ ^[A-Za-z0-9._:-]+$ ]] || {
  echo "BUILD_ID contains unsupported characters." >&2
  exit 2
}
[[ "${MODE}" == docker || -z "${SERVICE}" ]] || {
  echo "--service is only valid for Docker logs." >&2; exit 2;
}
[[ "${MODE}" == docker || "${FOLLOW}" -eq 0 ]] || {
  echo "--follow is only valid for Docker logs." >&2; exit 2;
}

DEPLOY_DIR=/srv/workx/deploy/platform
CONFIG_DIR=/srv/workx/config/platform
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
FAILURE_DIR=/srv/workx/logs/deployments/platform

if [[ "${MODE}" == failures ]]; then
  if [[ ! -d "${FAILURE_DIR}" ]] || ! compgen -G "${FAILURE_DIR}/*.failure.log" >/dev/null; then
    echo "No saved platform deployment failures were found."
    exit 0
  fi
  find "${FAILURE_DIR}" -maxdepth 1 -type f -name '*.failure.log' \
    -printf '%T@ %f\n' | sort -nr | cut -d' ' -f2- | sed 's/\.failure\.log$//'
  exit 0
fi

if [[ "${MODE}" == failure ]]; then
  [[ -n "${BUILD_ID}" ]] || { echo "BUILD_ID is required." >&2; exit 2; }
  failure_file="${FAILURE_DIR}/${BUILD_ID}.failure.log"
  if [[ ! -f "${failure_file}" ]]; then
    echo "No saved platform deployment failure exists for build '${BUILD_ID}'." >&2
    echo "Available failures:" >&2
    if [[ -d "${FAILURE_DIR}" ]]; then
      find "${FAILURE_DIR}" -maxdepth 1 -type f -name '*.failure.log' \
        -printf '  %f\n' | sort | sed 's/\.failure\.log$//' >&2
    fi
    exit 4
  fi
  cat -- "${failure_file}"
  exit 0
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is not installed on the VM." >&2; exit 4; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose is not available on the VM." >&2; exit 4; }
[[ -f "${COMPOSE_FILE}" ]] || { echo "Missing ${COMPOSE_FILE}." >&2; exit 4; }
[[ -f "${CONFIG_DIR}/.env" ]] || { echo "Missing platform runtime .env." >&2; exit 4; }
[[ -f "${CONFIG_DIR}/staging.env" ]] || { echo "Missing platform staging.env." >&2; exit 4; }

export WORKX_BE_IMAGE=workx-be:latest
export WORKX_FE_IMAGE=workx-fe:latest
export WORKX_WORKER_IMAGE=workx-worker:latest
compose=(docker compose --env-file "${CONFIG_DIR}/.env" --env-file "${CONFIG_DIR}/staging.env" -f "${COMPOSE_FILE}")
if ! services_output="$("${compose[@]}" config --services)"; then
  echo "Could not read platform services from Docker Compose." >&2
  exit 4
fi
mapfile -t services <<<"${services_output}"
[[ "${#services[@]}" -gt 0 && -n "${services[0]}" ]] || { echo "Docker Compose returned no platform services." >&2; exit 4; }

if [[ "${MODE}" == services ]]; then
  printf '%s\n' "${services[@]}"
  exit 0
fi

if [[ -n "${SERVICE}" ]]; then
  valid=0
  for candidate in "${services[@]}"; do
    [[ "${candidate}" == "${SERVICE}" ]] && valid=1
  done
  if [[ "${valid}" -ne 1 ]]; then
    echo "Unknown platform Compose service: ${SERVICE}" >&2
    echo >&2
    echo "Valid services:" >&2
    printf '  %s\n' "${services[@]}" >&2
    exit 3
  fi
  if [[ -z "$("${compose[@]}" ps -aq "${SERVICE}")" ]]; then
    echo "Service '${SERVICE}' is valid, but no container exists for it." >&2
    "${compose[@]}" ps -a >&2 || true
    exit 4
  fi
fi

logs=("${compose[@]}" logs --timestamps --no-color --tail="${TAIL}")
[[ "${FOLLOW}" -eq 1 ]] && logs+=(--follow)
[[ -n "${SERVICE}" ]] && logs+=("${SERVICE}")
exec "${logs[@]}"
