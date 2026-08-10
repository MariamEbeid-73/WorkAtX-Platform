#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"

BRANCH="${BRANCH:-}"
DEPLOY=true
for arg in "$@"; do
  case "${arg}" in
    --build-only) DEPLOY=false ;;
    --branch=*) BRANCH="${arg#--branch=}" ;;
    *) workx_fail "Unknown option: ${arg}" ;;
  esac
done
if [[ -z "${BRANCH}" ]]; then
  printf 'BRANCH is required.\n\nExample:\nmake deploy BRANCH=last-touch\n' >&2
  exit 1
fi
workx_validate_ref BRANCH "${BRANCH}"
workx_gcloud_init
trap workx_gcloud_cleanup EXIT
TRIGGER="${WORKX_PLATFORM_BUILD_TRIGGER:-workx-platform-deploy}"
printf 'Starting WorkX platform build for branch %s (deploy=%s)\n' "${BRANCH}" "${DEPLOY}"
workx_gcloud builds triggers run "${TRIGGER}" --region="${WORKX_GCP_REGION}" \
  --branch="${BRANCH}" --substitutions="_DEPLOY=${DEPLOY}"

