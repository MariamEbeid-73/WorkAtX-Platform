#!/usr/bin/env bash
# WorkX startup — macOS (Docker Desktop)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STARTUP_PLATFORM_LABEL="macOS"
STARTUP_ENTRY_SCRIPT="./scripts/startup-mac.sh"

print_docker_install_help() {
  cat <<'EOF'
  WorkX requires Docker and Docker Compose on macOS.

  Install Docker Desktop (includes Docker Engine + Compose plugin):
    https://docs.docker.com/desktop/setup/install/mac-install/

  Or with Homebrew:
    brew install --cask docker

  After installation, open Docker Desktop from Applications and wait until
  it shows "Docker Desktop is running".
EOF
}

print_compose_install_help() {
  cat <<'EOF'
  Docker Compose was not found. It is included with Docker Desktop.

  Reinstall or update Docker Desktop:
    https://docs.docker.com/desktop/setup/install/mac-install/

  Verify after install:
    docker compose version
EOF
}

print_docker_daemon_help() {
  cat <<'EOF'
  On macOS, Docker runs through Docker Desktop.

  1. Open Docker Desktop from Applications (or Spotlight: "Docker")
  2. Wait until the whale icon in the menu bar is steady (not animating)
  3. Run this script again:
       ./scripts/startup-mac.sh
EOF
}

# shellcheck source=startup-common.sh
source "${SCRIPT_DIR}/startup-common.sh"
run_startup
