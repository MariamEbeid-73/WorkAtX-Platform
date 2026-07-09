#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OS="$(uname -s)"

case "${OS}" in
  Darwin)
    exec "${SCRIPT_DIR}/scripts/startup-mac.sh" "$@"
    ;;
  Linux)
    exec "${SCRIPT_DIR}/scripts/startup-linux.sh" "$@"
    ;;
  *)
    echo "Unsupported operating system: ${OS}" >&2
    exit 1
    ;;
esac
