#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=gcloud-session.sh
source "${SCRIPT_DIR}/gcloud-session.sh"
workx_gcloud_init
trap workx_gcloud_cleanup EXIT
workx_ssh --command="sudo sh -c 'if test -f /srv/workx/state/platform/current.env; then cat /srv/workx/state/platform/current.env; else echo Platform deployment state is not initialized.; fi'"

