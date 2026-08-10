#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"
SHA="${SHA:-${1:-}}"
[[ "${SHA}" =~ ^[0-9a-fA-F]{40}$ ]] || workx_fail "SHA must be a full 40-character Git commit SHA."
workx_gcloud_init
trap workx_gcloud_cleanup EXIT
PREFIX="${WORKX_GCP_REGION}-docker.pkg.dev/${WORKX_GCP_PROJECT}/workx-images"
BUILD_ID="manual-rollback-$(date -u +%Y%m%dT%H%M%SZ)"
workx_ssh --command="sudo /srv/workx/deploy/platform/remote-deploy.sh --be-image '${PREFIX}/backend:${SHA}' --fe-image '${PREFIX}/frontend:${SHA}' --worker-image '${PREFIX}/worker:${SHA}' --sha '${SHA}' --branch rollback --build-id '${BUILD_ID}'"

