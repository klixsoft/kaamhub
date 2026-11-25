# Deployment

KaamHub runs as three containers managed by Docker Compose:

| Service | Purpose |
|---|---|
| `db` | PostgreSQL 17 with a named volume |
| `app` | The Next.js application. Runs database migrations on start. |
| `updater` | Pulls a new app image and restarts it when an admin clicks **Update**, and triggers the daily billing job |

## 1. Publish images

Images are built by `.github/workflows/release.yml` when you push a tag:

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```

The workflow publishes multi-architecture images (amd64 and arm64):

- `ghcr.io/<owner>/<repo>:<version>` and `:latest`
- `ghcr.io/<owner>/<repo>-updater:<version>` and `:latest`

It then creates a GitHub Release with generated notes. The System page compares the running version with the latest release.

If the repository is private, make the packages public or run `docker login ghcr.io` on the server with a token that has `read:packages`.

## 2. Prepare the server

Install Docker Engine with the Compose plugin. Then:

```bash
mkdir -p /opt/kaamhub && cd /opt/kaamhub
```

Copy `docker-compose.yml` and `.env.production.example` from the repository into this folder, then:

```bash
mv .env.production.example .env
```

```bash
chmod 600 .env
```

Fill in `.env`. At minimum: `APP_IMAGE`, `UPDATER_IMAGE`, `APP_URL`, `POSTGRES_PASSWORD`, `BETTER_AUTH_SECRET`, `UPDATER_TOKEN`, `CRON_SECRET` and `UPDATE_REPOSITORY`. `CRON_SECRET` enables the daily job that prepares recurring invoices and sends renewal reminders (see [billing.md](billing.md#scheduling-the-daily-job)). Generate secrets with:

```bash
openssl rand -base64 48
```

## 3. Start

```bash
docker compose up -d
```

The app listens on `127.0.0.1:3000`. Visit your domain and complete `/setup`.

## 4. HTTPS with a reverse proxy

Caddy obtains and renews certificates automatically. Example `Caddyfile`:

```
hub.example.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

With Nginx, proxy to `127.0.0.1:3000` and forward `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`. `APP_URL` must match the public HTTPS address exactly.

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

## Health check

`GET /api/health` returns `{"status":"ok","version":"x.y.z"}` when the app can reach the database. Docker uses it for the container health check.
