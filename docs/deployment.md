# Deployment

KaamHub runs on any Linux VPS with Docker. A small server with 2 GB of RAM is a comfortable starting point.

The stack is managed by Docker Compose:

| Service | Purpose |
|---|---|
| `db` | PostgreSQL 17 with a named volume |
| `app` | The Next.js application. Runs database migrations on start |
| `updater` | Pulls a new app image and restarts it when an admin clicks **Update**, and triggers the daily billing job |
| `caddy` | Optional (`https` profile). Serves KaamHub on your domain with automatic HTTPS certificates |

## Before you start

1. A Linux server (Ubuntu, Debian, Fedora, Rocky and similar) with a public IP.
2. Optional but recommended: a domain or subdomain, e.g. `hub.example.com`, with an **A record pointing to the server's IP**. Ports 80 and 443 must be open for HTTPS certificates.
3. Published Docker images. Maintainers publish them by pushing a version tag (see [Publishing images](#publishing-images)).

## Option 1: one-command install (recommended)

Run as root on the server:

```bash
curl -fsSL https://raw.githubusercontent.com/klixsoft/kaamhub/main/scripts/install.sh | sudo bash
```

The installer:

1. installs Docker if it is missing,
2. asks for your domain (leave empty to run on `http://<server-ip>:3000`) and, optionally, an SMTP host,
3. downloads `docker-compose.yml` and the `Caddyfile` into `/opt/kaamhub`,
4. generates every secret (database password, auth secret, updater token, cron secret) into `/opt/kaamhub/.env`,
5. starts the stack, waits until it is healthy and prints the URL.

Open `https://your-domain/setup` to create the first administrator.

To install from a fork, set `KAAMHUB_REPOSITORY=owner/repo` before running the script. To install somewhere else, set `KAAMHUB_DIR`.

### After installing

Edit `/opt/kaamhub/.env` to add SMTP and GitHub App settings, then apply them:

```bash
cd /opt/kaamhub && docker compose up -d
```

## Option 2: manual install

Install Docker Engine with the Compose plugin, then:

```bash
mkdir -p /opt/kaamhub && cd /opt/kaamhub
```

```bash
curl -fsSLO https://raw.githubusercontent.com/klixsoft/kaamhub/main/docker-compose.yml
```

```bash
curl -fsSL https://raw.githubusercontent.com/klixsoft/kaamhub/main/docker/Caddyfile -o Caddyfile
```

```bash
curl -fsSL https://raw.githubusercontent.com/klixsoft/kaamhub/main/.env.production.example -o .env && chmod 600 .env
```

Fill in `.env`. At minimum: `DOMAIN`, `APP_URL`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `UPDATER_TOKEN` and `CRON_SECRET`. Generate each secret with:

```bash
openssl rand -hex 32
```

Start the stack:

```bash
docker compose up -d
```

## HTTPS

### Built-in Caddy (default)

With `COMPOSE_PROFILES=https` and `DOMAIN=hub.example.com` in `.env`, the `caddy` service listens on ports 80 and 443 and obtains certificates from Let's Encrypt automatically. `APP_URL` must be `https://hub.example.com`.

### Your own reverse proxy

If the server already runs Nginx, Traefik or another proxy, set `COMPOSE_PROFILES=` (empty) and point the proxy at `127.0.0.1:3000`. Forward `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`. Example for Nginx:

```
server {
  server_name hub.example.com;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Without a domain

Set `APP_BIND=0.0.0.0` and `APP_URL=http://<server-ip>:3000`. This is fine for trying KaamHub, but use HTTPS for real data.

## Updating

### One click (recommended)

Open **System** in the sidebar (Super Admin only). When a newer release exists, click **Update to x.y.z**. The updater:

1. writes `APP_TAG=x.y.z` to `.env`,
2. runs `docker compose pull app`,
3. runs `docker compose up -d --no-deps app`.

The new container applies migrations before it starts serving. The page reloads automatically when the new version responds.

### Manually

```bash
cd /opt/kaamhub
```

```bash
sed -i 's/^APP_TAG=.*/APP_TAG=0.2.0/' .env
```

```bash
docker compose pull app && docker compose up -d app
```

### About the updater's access

The updater mounts `/var/run/docker.sock`, which gives it control over Docker on the host. To limit the risk:

- It is not published on any host port; only the `app` container can reach it on the internal network.
- Every request needs the `UPDATER_TOKEN` (compared in constant time).
- It only accepts a version string matching `x.y.z` and only runs fixed `docker compose pull` and `up` commands for the `app` service.
- The app only asks it to install the version reported by your own repository's latest GitHub Release.

If you do not want this, remove the `updater` service from `docker-compose.yml` and update manually.

## Backups

Back up the database regularly:

```bash
docker compose exec -T db pg_dump -U kaamhub -Fc kaamhub > backup-$(date +%F).dump
```

Restore into an empty database:

```bash
docker compose exec -T db pg_restore -U kaamhub -d kaamhub --clean < backup.dump
```

Keep `.env` in a safe place too; `BETTER_AUTH_SECRET` is needed to keep existing sessions valid.

## Publishing images

Images are built by `.github/workflows/release.yml` when a maintainer pushes a version tag:

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```

The workflow publishes multi-architecture images (amd64 and arm64) to GitHub Container Registry and creates a GitHub Release:

- `ghcr.io/<owner>/<repo>:<version>` and `:latest`
- `ghcr.io/<owner>/<repo>-updater:<version>` and `:latest`

Make the packages public in the repository's **Packages** settings so servers can pull them without logging in. The System page compares the running version with the latest release.

## Health check

`GET /api/health` returns `{"status":"ok","version":"x.y.z"}` when the app can reach the database. Docker uses it for the container health check.
