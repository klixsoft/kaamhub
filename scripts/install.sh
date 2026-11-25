#!/usr/bin/env bash
set -euo pipefail

REPOSITORY="${KAAMHUB_REPOSITORY:-klixsoft/kaamhub}"
BRANCH="${KAAMHUB_BRANCH:-main}"
INSTALL_DIR="${KAAMHUB_DIR:-/opt/kaamhub}"
RAW_URL="https://raw.githubusercontent.com/${REPOSITORY}/${BRANCH}"
IMAGE="ghcr.io/${REPOSITORY}"

info() { printf '\033[1;34m==>\033[0m %s\n' "$1"; }
fail() { printf '\033[1;31mError:\033[0m %s\n' "$1" >&2; exit 1; }
secret() { (LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom 2> /dev/null || true) | head -c "$1"; }
ask() {
  local prompt="$1" default="${2:-}" answer
  if [ -n "$default" ]; then prompt="$prompt [$default]"; fi
  read -r -p "$prompt: " answer < /dev/tty
  printf '%s' "${answer:-$default}"
}

[ "$(id -u)" -eq 0 ] || fail "Run this script as root, for example: curl -fsSL ${RAW_URL}/scripts/install.sh | sudo bash"
[ "$(uname -s)" = "Linux" ] || fail "KaamHub can only be installed on Linux servers."
command -v curl > /dev/null || fail "curl is required."

if ! command -v docker > /dev/null; then
  info "Installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
docker compose version > /dev/null 2>&1 || fail "The Docker Compose plugin is missing. Install docker-compose-plugin and run the script again."

if [ -f "${INSTALL_DIR}/.env" ]; then
  fail "${INSTALL_DIR}/.env already exists. KaamHub looks installed; update it from the System page or with: cd ${INSTALL_DIR} && docker compose pull && docker compose up -d"
fi

DOMAIN="$(ask "Domain for KaamHub (DNS must already point to this server, leave empty to skip HTTPS)")"
if [ -n "$DOMAIN" ]; then
  APP_URL="https://${DOMAIN}"
  PROFILES="https"
else
  SERVER_IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
  APP_URL="http://${SERVER_IP}:3000"
  PROFILES=""
fi
SMTP_HOST="$(ask "SMTP host for emails (leave empty to configure later)")"

info "Downloading KaamHub into ${INSTALL_DIR}"
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"
curl -fsSL "${RAW_URL}/docker-compose.yml" -o docker-compose.yml
curl -fsSL "${RAW_URL}/docker/Caddyfile" -o Caddyfile

info "Generating secrets"
umask 077
cat > .env <<ENV
APP_IMAGE=${IMAGE}
APP_TAG=latest
UPDATER_IMAGE=${IMAGE}-updater
UPDATER_TAG=latest
COMPOSE_PROFILES=${PROFILES}
DOMAIN=${DOMAIN}
APP_BIND=$([ -n "$DOMAIN" ] && echo 127.0.0.1 || echo 0.0.0.0)
APP_PORT=3000
APP_URL=${APP_URL}
POSTGRES_DB=kaamhub
POSTGRES_USER=kaamhub
POSTGRES_PASSWORD=$(secret 40)
BETTER_AUTH_SECRET=$(secret 64)
UPDATER_TOKEN=$(secret 64)
CRON_SECRET=$(secret 64)
UPDATE_REPOSITORY=${REPOSITORY}
SMTP_HOST=${SMTP_HOST}
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_INSTALLATION_ID=
GITHUB_ORG=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
ENV

info "Starting KaamHub"
docker compose pull
docker compose up -d

info "Waiting for KaamHub to become healthy"
for _ in $(seq 1 60); do
  if docker compose exec -T app wget -qO- http://127.0.0.1:3000/api/health > /dev/null 2>&1; then
    printf '\n\033[1;32mKaamHub is running.\033[0m\n'
    printf 'Open %s/setup to create the first administrator.\n' "$APP_URL"
    printf 'Settings are in %s/.env. Edit it and run "docker compose up -d" to apply changes.\n' "$INSTALL_DIR"
    exit 0
  fi
  sleep 5
done
fail "KaamHub did not become healthy in time. Check the logs with: cd ${INSTALL_DIR} && docker compose logs app"
