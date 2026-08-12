#!/usr/bin/env bash
# Stream platform runtime logs from the staging VM through the isolated deploy identity.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"

SERVICE="${WORKX_LOG_SERVICE:-}"
TAIL="${WORKX_LOG_TAIL:-all}"
FOLLOW="${WORKX_LOG_FOLLOW:-0}"
MODE="docker"
BUILD_ID="${WORKX_LOG_BUILD_ID:-}"

select_mode() {
  [[ "${MODE}" == docker ]] || workx_fail "Logging modes cannot be combined."
  MODE="$1"
}

usage() {
  cat <<'EOF'
Usage: scripts/logs.sh [options]

Options:
  --service NAME       Select one Compose service (default: all services)
  --tail N             Show the latest N lines per container (default: all retained)
  --follow             Continue streaming new lines
  --list-services      List valid Compose services
  --list-failures      List saved failed-deployment snapshots
  --failure BUILD_ID   Print one saved failed-deployment snapshot
  --help               Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --service) [[ $# -ge 2 && -n "$2" ]] || workx_fail "--service requires a value."; SERVICE="$2"; shift 2 ;;
    --tail) [[ $# -ge 2 && -n "$2" ]] || workx_fail "--tail requires a value."; TAIL="$2"; shift 2 ;;
    --follow) FOLLOW=1; shift ;;
    --list-services) select_mode services; shift ;;
    --list-failures) select_mode failures; shift ;;
    --failure) [[ $# -ge 2 && -n "$2" ]] || workx_fail "--failure requires a build ID."; select_mode failure; BUILD_ID="$2"; shift 2 ;;
    --help) usage; exit 0 ;;
    *) workx_fail "Unknown option: $1" ;;
  esac
done

[[ "${TAIL}" == all || "${TAIL}" =~ ^[0-9]+$ ]] || \
  workx_fail "TAIL must be 'all' or a non-negative integer."
[[ "${FOLLOW}" == 0 || "${FOLLOW}" == 1 ]] || workx_fail "FOLLOW must be 0 or 1."
[[ -z "${SERVICE}" || "${SERVICE}" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]*$ ]] || \
  workx_fail "SERVICE contains unsupported characters."
[[ -z "${BUILD_ID}" || "${BUILD_ID}" =~ ^[A-Za-z0-9._:-]+$ ]] || \
  workx_fail "BUILD_ID contains unsupported characters."
[[ "${MODE}" != failure || -n "${BUILD_ID}" ]] || workx_fail "BUILD_ID is required."
[[ "${MODE}" == docker || -z "${SERVICE}" ]] || workx_fail "SERVICE is only valid for Docker logs."
[[ "${MODE}" == docker || "${FOLLOW}" == 0 ]] || workx_fail "FOLLOW is only valid for Docker logs."

remote_args=()
case "${MODE}" in
  docker)
    [[ -n "${SERVICE}" ]] && remote_args+=(--service "${SERVICE}")
    remote_args+=(--tail "${TAIL}")
    [[ "${FOLLOW}" == 1 ]] && remote_args+=(--follow)
    ;;
  services) remote_args+=(--list-services) ;;
  failures) remote_args+=(--list-failures) ;;
  failure) remote_args+=(--failure "${BUILD_ID}") ;;
esac

workx_gcloud_init
trap workx_gcloud_cleanup EXIT

REMOTE_HELPER=/srv/workx/deploy/platform/remote-logs.sh
remote_command="if ! sudo test -x ${REMOTE_HELPER}; then echo 'The remote platform logging helper is not installed on workx-staging.' >&2; echo 'Deploy this repository once, then retry.' >&2; exit 4; fi; sudo ${REMOTE_HELPER}"
for arg in "${remote_args[@]}"; do
  printf -v quoted_arg '%q' "${arg}"
  remote_command+=" ${quoted_arg}"
done

workx_ssh --command="${remote_command}"
