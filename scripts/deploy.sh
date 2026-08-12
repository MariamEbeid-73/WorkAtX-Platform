#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"

BRANCH="${BRANCH:-main}"
DEPLOY=true
for arg in "$@"; do
  case "${arg}" in
    --build-only) DEPLOY=false ;;
    --branch=*) BRANCH="${arg#--branch=}" ;;
    *) workx_fail "Unknown option: ${arg}" ;;
  esac
done
workx_validate_ref BRANCH "${BRANCH}"
workx_gcloud_init
SOURCE_DIR="$(mktemp -d -t workx-platform-source.XXXXXX)"
cleanup() {
  rm -rf -- "${SOURCE_DIR}"
  workx_gcloud_cleanup
}
trap cleanup EXIT

command -v git >/dev/null 2>&1 || workx_fail "Required command not found: git"
command -v tar >/dev/null 2>&1 || workx_fail "Required command not found: tar"
git -C "${WORKX_REPO_ROOT}" fetch --quiet origin \
  "refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}" || \
  workx_fail "Could not fetch branch '${BRANCH}' from origin."
COMMIT_SHA="$(git -C "${WORKX_REPO_ROOT}" rev-parse --verify "refs/remotes/origin/${BRANCH}^{commit}")"
git -C "${WORKX_REPO_ROOT}" archive "${COMMIT_SHA}" | tar -x -C "${SOURCE_DIR}"

printf 'Starting WorkX build for branch %s at %s (deploy=%s)\n' "${BRANCH}" "${COMMIT_SHA}" "${DEPLOY}"
workx_gcloud builds submit "${SOURCE_DIR}" \
  --config="${SOURCE_DIR}/cloudbuild.yaml" \
  --region="${WORKX_GCP_REGION}" \
  --service-account="projects/${WORKX_GCP_PROJECT}/serviceAccounts/workx-cloud-builder@${WORKX_GCP_PROJECT}.iam.gserviceaccount.com" \
  --substitutions="COMMIT_SHA=${COMMIT_SHA},BRANCH_NAME=${BRANCH},_DEPLOY=${DEPLOY}"
