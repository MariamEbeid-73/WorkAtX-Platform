#!/usr/bin/env bash
# WorkX startup — Linux (Docker Engine + Compose)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STARTUP_PLATFORM_LABEL="Linux"
STARTUP_ENTRY_SCRIPT="./scripts/startup-linux.sh"

print_docker_install_help() {
  cat <<'EOF'
  WorkX requires Docker Engine and Docker Compose on Linux.

  Official install guide (pick your distribution):
    https://docs.docker.com/engine/install/

  Ubuntu / Debian (example):
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl
    sudo install -m 0755 -d /etc/apt/keyrings
    sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    sudo chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] \
      https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" | \
      sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  Add your user to the docker group (log out and back in afterward):
    sudo usermod -aG docker "$USER"
EOF
}

print_compose_install_help() {
  cat <<'EOF'
  Docker Compose plugin was not found.

  Install the Compose plugin (recommended):
    sudo apt-get install -y docker-compose-plugin    # Debian/Ubuntu
    sudo dnf install -y docker-compose-plugin        # Fedora/RHEL

  Or install the standalone binary:
    https://docs.docker.com/compose/install/linux/

  Verify after install:
    docker compose version
EOF
}

print_docker_daemon_help() {
  cat <<'EOF'
  Docker is installed but the daemon is not reachable.

  Start and enable the Docker service:
    sudo systemctl start docker
    sudo systemctl enable docker

  If you recently added yourself to the "docker" group, log out and back in
  (or run: newgrp docker), then try again.

  Verify:
    docker info

  Then run:
    ./scripts/startup-linux.sh
EOF
}

# shellcheck source=startup-common.sh
source "${SCRIPT_DIR}/startup-common.sh"
run_startup
