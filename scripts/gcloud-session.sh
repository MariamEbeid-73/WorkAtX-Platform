#!/usr/bin/env bash
# Shared, isolated gcloud session for WorkX deployment scripts.

set -euo pipefail

WORKX_SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKX_REPO_ROOT="$(cd "${WORKX_SCRIPT_DIR}/.." && pwd)"
WORKX_GCP_PROJECT="${WORKX_GCP_PROJECT:-work-at-x}"
WORKX_GCP_REGION="${WORKX_GCP_REGION:-me-central1}"
WORKX_VM_NAME="${WORKX_VM_NAME:-workx-staging}"
WORKX_VM_ZONE="${WORKX_VM_ZONE:-me-central1-a}"
WORKX_REMOTE_USER="${WORKX_REMOTE_USER:-workxdeploy}"
WORKX_GCLOUD_BIN="${WORKX_GCLOUD_BIN:-gcloud}"
WORKX_GCP_CREDENTIALS="${WORKX_GCP_CREDENTIALS:-${WORKX_REPO_ROOT}/secrets/gcp-deployer.json}"
WORKX_GCLOUD_CONFIG=""
WORKX_SSH_KEY=""

workx_fail() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }
workx_require_command() { command -v "$1" >/dev/null 2>&1 || workx_fail "Required command not found: $1"; }

workx_validate_ref() {
  local label="$1" value="$2"
  [[ -n "${value}" ]] || workx_fail "${label} is required."
  [[ "${value}" != -* ]] || workx_fail "${label} must not start with '-'."
  [[ "${value}" != *$'\n'* && "${value}" != *$'\r'* ]] || workx_fail "${label} must be one line."
  [[ "${value}" =~ ^[A-Za-z0-9._/-]+$ ]] || workx_fail "${label} contains unsupported characters: ${value}"
}

workx_gcloud_init() {
  if [[ "${WORKX_GCLOUD_BIN}" == */* ]]; then
    [[ -x "${WORKX_GCLOUD_BIN}" ]] || workx_fail "gcloud is not executable: ${WORKX_GCLOUD_BIN}"
  else
    workx_require_command "${WORKX_GCLOUD_BIN}"
  fi
  if [[ "${WORKX_GCP_CREDENTIALS}" != /* ]]; then
    WORKX_GCP_CREDENTIALS="${WORKX_REPO_ROOT}/${WORKX_GCP_CREDENTIALS}"
  fi
  if [[ ! -r "${WORKX_GCP_CREDENTIALS}" ]]; then
    cat >&2 <<EOF
GCP deployment credential not found.

Expected:
${WORKX_GCP_CREDENTIALS}

Set WORKX_GCP_CREDENTIALS or obtain the deployment credential from the team.
EOF
    exit 1
  fi
  WORKX_GCLOUD_CONFIG="$(mktemp -d -t workx-gcloud.XXXXXX)"
  WORKX_SSH_KEY="${WORKX_GCLOUD_CONFIG}/ssh/google_compute_engine"
  mkdir -p "$(dirname "${WORKX_SSH_KEY}")"
  export CLOUDSDK_CONFIG="${WORKX_GCLOUD_CONFIG}"
  export CLOUDSDK_CORE_DISABLE_PROMPTS=1
  "${WORKX_GCLOUD_BIN}" auth activate-service-account \
    --key-file="${WORKX_GCP_CREDENTIALS}" --project="${WORKX_GCP_PROJECT}" --quiet >/dev/null || \
    workx_fail "Could not authenticate with the deployment credential."
}

workx_gcloud_cleanup() {
  if [[ -n "${WORKX_GCLOUD_CONFIG}" && -d "${WORKX_GCLOUD_CONFIG}" ]]; then rm -rf -- "${WORKX_GCLOUD_CONFIG}"; fi
  WORKX_GCLOUD_CONFIG=""
  WORKX_SSH_KEY=""
}

workx_gcloud() { "${WORKX_GCLOUD_BIN}" "$@" --project="${WORKX_GCP_PROJECT}" --quiet; }

workx_ssh() {
  workx_gcloud compute ssh "${WORKX_REMOTE_USER}@${WORKX_VM_NAME}" \
    --zone="${WORKX_VM_ZONE}" --ssh-key-file="${WORKX_SSH_KEY}" \
    --ssh-key-expire-after=30m "$@"
}

