#!/usr/bin/env bash
# Shared WorkX startup logic (sourced by startup-mac.sh / startup-linux.sh)

set -e

CYAN="\033[0;36m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
BOLD="\033[1m"
RESET="\033[0m"

# Resolve repo root (parent of scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${REPO_ROOT}"

COMPOSE_CMD=()

print_banner() {
  echo ""
  echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}║              WorkX — startup             ║${RESET}"
  if [[ -n "${STARTUP_PLATFORM_LABEL:-}" ]]; then
    printf "${CYAN}${BOLD}║  Platform: %-28s ║${RESET}\n" "${STARTUP_PLATFORM_LABEL}"
  fi
  echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════╝${RESET}"
  echo ""
}

fail() {
  echo -e "${RED}${BOLD}✗${RESET} $1" >&2
  exit 1
}

info() {
  echo -e "${YELLOW}→${RESET} $1"
}

resolve_compose_cmd() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD=(docker compose)
    return 0
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD=(docker-compose)
    return 0
  fi

  return 1
}

run_startup() {
  print_banner

  # ── .env bootstrap ─────────────────────────────────────────────────────────
  if [[ ! -f "${REPO_ROOT}/.env" ]]; then
    if [[ -f "${REPO_ROOT}/.env.example" ]]; then
      cp "${REPO_ROOT}/.env.example" "${REPO_ROOT}/.env"
      echo -e "${YELLOW}→${RESET} .env not found — created from .env.example. Edit it if needed."
      echo ""
    else
      fail ".env not found and no .env.example to copy from. Create .env manually."
    fi
  fi

  # ── Prerequisites ──────────────────────────────────────────────────────────
  echo -e "${YELLOW}${BOLD}Checking prerequisites...${RESET}"
  echo ""

  if ! command -v docker >/dev/null 2>&1; then
    echo -e "${RED}${BOLD}Docker is not installed.${RESET}"
    echo ""
    print_docker_install_help
    fail "Install Docker, then run this script again."
  fi
  echo -e "${GREEN}      ✓ Docker CLI found${RESET} ($(docker --version 2>/dev/null | head -1))"

  if ! resolve_compose_cmd; then
    echo -e "${RED}${BOLD}Docker Compose is not available.${RESET}"
    echo ""
    print_compose_install_help
    fail "Install Docker Compose, then run this script again."
  fi
  echo -e "${GREEN}      ✓ Docker Compose found${RESET} ($("${COMPOSE_CMD[@]}" version 2>/dev/null | head -1))"

  if ! docker info >/dev/null 2>&1; then
    echo ""
    echo -e "${RED}${BOLD}Docker is installed but the daemon is not running.${RESET}"
    echo ""
    print_docker_daemon_help
    fail "Start Docker, then run this script again."
  fi
  echo -e "${GREEN}      ✓ Docker daemon is running${RESET}"
  echo ""

  # ── Step 1: stop existing stack ────────────────────────────────────────────
  echo -e "${YELLOW}[1/4] Stopping any existing WorkX containers...${RESET}"
  "${COMPOSE_CMD[@]}" down --remove-orphans 2>/dev/null || true
  echo -e "${GREEN}      ✓ Stack cleared${RESET}"
  echo ""

  # ── Step 2: build backend image ──────────────────────────────────────────────
  echo -e "${YELLOW}[2/4] Building Backend image (ASP.NET Core)...${RESET}"
  BE_CACHE=()
  docker image inspect workx-be:latest >/dev/null 2>&1 && BE_CACHE=(--cache-from workx-be:latest)
  docker build "${BE_CACHE[@]}" -t workx-be:latest ./BE
  echo -e "${GREEN}      ✓ Backend image ready${RESET}"
  echo ""

  # ── Step 3: build frontend image ─────────────────────────────────────────────
  echo -e "${YELLOW}[3/4] Building Frontend image (React + nginx)...${RESET}"
  FE_CACHE=()
  docker image inspect workx-fe:latest >/dev/null 2>&1 && FE_CACHE=(--cache-from workx-fe:latest)
  docker build "${FE_CACHE[@]}" -t workx-fe:latest ./FE
  echo -e "${GREEN}      ✓ Frontend image ready${RESET}"
  echo ""

  # ── Step 4: launch the full stack ────────────────────────────────────────────
  echo -e "${YELLOW}[4/4] Starting all services (BE + FE + SQL)...${RESET}"
  "${COMPOSE_CMD[@]}" up -d
  echo -e "${GREEN}      ✓ All containers running${RESET}"
  echo ""

  # ── Done ───────────────────────────────────────────────────────────────────
  echo -e "${CYAN}${BOLD}╔═══════════════════════════════════════════════════════════╗${RESET}"
  echo -e "${CYAN}${BOLD}║              🎉  WorkX is up and running!                 ║${RESET}"
  echo -e "${CYAN}${BOLD}╠═══════════════════════════════════════════════════════════╣${RESET}"
  echo -e "${CYAN}${BOLD}║                                                           ║${RESET}"
  echo -e "${CYAN}${BOLD}║  Frontend      →  http://localhost:4200                   ║${RESET}"
  echo -e "${CYAN}${BOLD}║  Backend       →  http://localhost:5000                   ║${RESET}"
  echo -e "${CYAN}${BOLD}║  Swagger       →  http://localhost:5000/swagger           ║${RESET}"
  echo -e "${CYAN}${BOLD}║  MinIO API     →  https://localhost:9000                  ║${RESET}"
  echo -e "${CYAN}${BOLD}║  MinIO Console →  http://localhost:9001                   ║${RESET}"
  echo -e "${CYAN}${BOLD}║                   (User: minioadmin / Pass: minioadmin)   ║${RESET}"
  echo -e "${CYAN}${BOLD}║                                                           ║${RESET}"
  echo -e "${CYAN}${BOLD}╚═══════════════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "${YELLOW}📌 Note for team:${RESET} If using local HTTPS on MinIO, open ${BOLD}https://localhost:9000${RESET} once in your browser to accept the self-signed cert."
  echo ""
  echo -e "  To stop everything:  ${BOLD}${COMPOSE_CMD[*]} down${RESET}"
  echo -e "  To view logs:        ${BOLD}${COMPOSE_CMD[*]} logs -f${RESET}"
  echo -e "  To rebuild fresh:    ${BOLD}${COMPOSE_CMD[*]} down && ${STARTUP_ENTRY_SCRIPT:-./startup.sh}${RESET}"
  echo ""
}
