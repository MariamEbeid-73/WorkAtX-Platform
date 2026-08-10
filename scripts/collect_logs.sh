#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"
OUT_DIR="${1:-.}"
mkdir -p "${OUT_DIR}"
workx_gcloud_init
trap workx_gcloud_cleanup EXIT
timestamp="$(date +%Y%m%d-%H%M%S)"
output="${OUT_DIR}/workx-platform-logs-${timestamp}.txt"
workx_ssh --command="sudo sh -c '
  echo \"--- deployment state ---\"
  test ! -f /srv/workx/state/platform/current.env || cat /srv/workx/state/platform/current.env
  echo \"--- compose state ---\"
  docker compose --env-file /srv/workx/config/platform/.env --env-file /srv/workx/config/platform/staging.env -f /srv/workx/deploy/platform/docker-compose.yml ps
  for name in workx-db workx-redis workx-minio workx-be workx-fe workx-worker; do
    echo \"--- \\$name ---\"
    docker logs --timestamps --tail=1000 \"\\$name\" 2>&1 || true
  done
'" > "${output}"
printf 'Created %s\n' "${output}"

