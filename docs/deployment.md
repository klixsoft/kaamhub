# Deployment

KaamHub runs on any Linux VPS with Docker. A small server with 2 GB of RAM is a comfortable starting point.

There are two ways to install it:

- [Option 1: one-command install](#option-1-one-command-install-recommended) sets everything up for you.
- [Option 2: Docker Compose by hand](#option-2-docker-compose-by-hand) gives you full control, step by step.

Both run the same published images and the same `docker-compose.yml`, so you can switch between them later.

## Images

Every release publishes two images for `linux/amd64` and `linux/arm64` to GitHub Container Registry:

| Image | Tags | Purpose |
|---|---|---|
| `ghcr.io/klixsoft/kaamhub` | `0.1.0`, `latest` | The application. Applies database migrations every time it starts, then serves on port `3000` |
| `ghcr.io/klixsoft/kaamhub-updater` | `0.1.0`, `latest` | Optional helper for one-click updates and the hourly scheduled job |

Use an exact version such as `0.1.0` to control when you upgrade, or `latest` to always get the newest release when you pull. The list of versions is on the [releases page](https://github.com/klixsoft/kaamhub/releases).

The application image runs as an unprivileged user (UID 1001), stores uploaded documents in `/app/storage` and reports its health at `/api/health`.

## The stack

`docker-compose.yml` defines four services:

| Service | Image | Purpose | Data | Host ports |
|---|---|---|---|---|
| `db` | `postgres:17-alpine` | PostgreSQL database | `db-data` volume | None |
| `app` | `ghcr.io/klixsoft/kaamhub` | KaamHub itself | `app-storage` volume (documents) | `APP_BIND:APP_PORT`, by default `127.0.0.1:3000` |
| `updater` | `ghcr.io/klixsoft/kaamhub-updater` | Updates the app when an admin clicks **Update**, and calls the scheduled job every hour | None | None |
| `caddy` | `caddy:2-alpine` | Optional (`https` profile). Serves KaamHub on your domain with automatic HTTPS certificates | `caddy-data`, `caddy-config` volumes | `80`, `443` |

All services share a private network. The database and the updater are never published on a host port.

## Before you start

1. A Linux server (Ubuntu, Debian, Fedora, Rocky and similar) with a public IP.
2. Optional but recommended: a domain or subdomain, e.g. `hub.example.com`, with an **A record pointing to the server's IP**. Ports 80 and 443 must be open for HTTPS certificates.
3. Docker Engine 24 or newer with the Compose plugin (`docker compose version` should print v2). The one-command installer installs Docker for you.

## Option 1: one-command install (recommended)

Run as root on the server:

```bash
curl -fsSL https://github.com/klixsoft/kaamhub/releases/latest/download/install.sh | sudo bash
```

This downloads the installer attached to the latest release. Every release pins the installer to its own configuration files. To install unreleased changes from `main`, use `https://raw.githubusercontent.com/klixsoft/kaamhub/main/scripts/install.sh`.

The installer:

1. installs Docker if it is missing,
2. asks for your domain (leave empty to run on `http://<server-ip>:3000`) and, optionally, an SMTP host,
3. downloads `docker-compose.yml` and the `Caddyfile` into `/opt/kaamhub`,
4. generates every secret (database password, auth secret, updater token, cron secret, encryption key) into `/opt/kaamhub/.env`,
5. starts the stack, waits until it is healthy and prints the URL.

Open `https://your-domain/setup` to create the first administrator.

To install from a fork, set `KAAMHUB_REPOSITORY=owner/repo` before running the script. To install somewhere else, set `KAAMHUB_DIR`.

### After installing

Edit `/opt/kaamhub/.env` to add SMTP and GitHub App settings, then apply them:

```bash
cd /opt/kaamhub && docker compose up -d
```

## Option 2: Docker Compose by hand

Run these commands as root, or as a user in the `docker` group.

### 1. Create a folder for KaamHub

Everything for this installation lives in one folder: the Compose file, the Caddy configuration and your `.env`.

```bash
mkdir -p /opt/kaamhub && cd /opt/kaamhub
```

### 2. Download the Compose files for a release

Choose the release to install. Using the files from the same release as the images keeps them compatible.

```bash
KAAMHUB_VERSION=v0.1.0
```

```bash
curl -fsSL "https://raw.githubusercontent.com/klixsoft/kaamhub/${KAAMHUB_VERSION}/docker-compose.yml" -o docker-compose.yml
```

```bash
curl -fsSL "https://raw.githubusercontent.com/klixsoft/kaamhub/${KAAMHUB_VERSION}/docker/Caddyfile" -o Caddyfile
```

```bash
curl -fsSL "https://raw.githubusercontent.com/klixsoft/kaamhub/${KAAMHUB_VERSION}/.env.production.example" -o .env && chmod 600 .env
```

`.env` holds your passwords and keys, so `chmod 600` keeps it readable by its owner only.

### 3. Generate the secrets

Run each command and paste its output into the matching line of `.env`:

| Variable | Command |
|---|---|
| `POSTGRES_PASSWORD` | `openssl rand -hex 24` |
| `BETTER_AUTH_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |
| `UPDATER_TOKEN` | `openssl rand -hex 32` |
| `CRON_SECRET` | `openssl rand -hex 32` |

Or fill all five in one go:

```bash
sed -i -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(openssl rand -hex 24)|" -e "s|^BETTER_AUTH_SECRET=.*|BETTER_AUTH_SECRET=$(openssl rand -hex 32)|" -e "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=$(openssl rand -hex 32)|" -e "s|^UPDATER_TOKEN=.*|UPDATER_TOKEN=$(openssl rand -hex 32)|" -e "s|^CRON_SECRET=.*|CRON_SECRET=$(openssl rand -hex 32)|" .env
```

Keep a copy of `.env` somewhere safe. Without `ENCRYPTION_KEY`, saved environment credentials cannot be read, and without `POSTGRES_PASSWORD` you cannot reach your database.

### 4. Choose how people reach KaamHub

Set these lines in `.env` for one of the three setups.

**A. Your own domain with automatic HTTPS (recommended).** Point the domain's DNS A record at the server and open ports 80 and 443 first.

```
COMPOSE_PROFILES=https
DOMAIN=hub.example.com
APP_URL=https://hub.example.com
APP_BIND=127.0.0.1
```

**B. Behind a reverse proxy you already run** (Nginx, Traefik, Apache, Cloudflare Tunnel). KaamHub listens on `127.0.0.1:3000` and your proxy serves the domain; see [Your own reverse proxy](#your-own-reverse-proxy).

```
COMPOSE_PROFILES=
DOMAIN=
APP_URL=https://hub.example.com
APP_BIND=127.0.0.1
```

**C. Server IP only, for trying it out.** Data travels unencrypted, so do not use this for real work.

```
COMPOSE_PROFILES=
DOMAIN=
APP_URL=http://203.0.113.10:3000
APP_BIND=0.0.0.0
```

`APP_URL` must be exactly the address people type in the browser, including `http` or `https` and any port. Sign-in only works from that address.

### 5. Optional settings

Everything else can be added now or later:

- **Email** (`SMTP_*`): needed to send invitations, password resets, invoices and reminders. Without it, emails are written to the app log instead.
- **GitHub** (`GITHUB_*`): see [github.md](github.md).

See [Environment variables](#environment-variables) for the full list.

### 6. Start KaamHub

```bash
docker compose pull
```

```bash
docker compose up -d
```

The first start creates the database and applies all migrations, which takes a few seconds. Check that every service is running and the app is `healthy`:

```bash
docker compose ps
```

```bash
curl -fsS http://127.0.0.1:3000/api/health
```

The health check answers `{"status":"ok","version":"0.1.0"}`.

### 7. Create the first administrator

Open `APP_URL/setup` in your browser, for example `https://hub.example.com/setup`, and create the Super Admin account. The setup page can only be used once.

### Pinning or changing the version

`APP_TAG` and `UPDATER_TAG` in `.env` choose the image versions. `latest` follows new releases whenever you run `docker compose pull`. An exact version such as `0.1.0` stays put until you change it, which is the safer choice for production. One-click updates write the exact version to `APP_TAG` for you.

## Environment variables

`.env` is read by Docker Compose and passed to the app. `DATABASE_URL` and `UPDATER_URL` are set by `docker-compose.yml` itself, so you do not add them when you use the bundled database and updater.

### Required

| Variable | Example | Notes |
|---|---|---|
| `APP_IMAGE` | `ghcr.io/klixsoft/kaamhub` | Application image. Change it only to run your own fork's images |
| `UPDATER_IMAGE` | `ghcr.io/klixsoft/kaamhub-updater` | Updater image |
| `APP_URL` | `https://hub.example.com` | Public address of KaamHub, used for links in emails and to protect sign-in |
| `POSTGRES_PASSWORD` | 48 hex characters | Password of the bundled database. It is applied when the database is first created; changing it later in `.env` alone does not change the database password |
| `BETTER_AUTH_SECRET` | 32 or more characters | Signs sessions. Changing it signs everyone out |
| `UPDATER_TOKEN` | 64 hex characters | Shared secret between the app and the updater |

### Recommended

| Variable | Default | Notes |
|---|---|---|
| `ENCRYPTION_KEY` | Empty | 64 hex characters. Required to save environment credentials. Never change it once credentials exist |
| `CRON_SECRET` | Empty | Enables the hourly job: recurring invoice drafts, renewal reminders and uptime checks |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Port `587`, not secure | Outgoing email. Use `SMTP_SECURE=true` with port `465` |

### Optional

| Variable | Default | Notes |
|---|---|---|
| `APP_TAG`, `UPDATER_TAG` | `latest` | Image versions |
| `COMPOSE_PROFILES` | Empty | `https` starts the bundled Caddy server |
| `DOMAIN` | Empty | Domain Caddy requests a certificate for |
| `APP_BIND` | `127.0.0.1` | Host address the app port is published on. `0.0.0.0` makes it reachable from outside |
| `APP_PORT` | `3000` | Host port for the app |
| `POSTGRES_DB`, `POSTGRES_USER` | `kaamhub` | Database name and user |
| `DATABASE_POOL_MAX` | `10` | Database connections per app container |
| `UPDATE_REPOSITORY` | Empty | `owner/repo` whose releases the System page checks, normally `klixsoft/kaamhub` |
| `GITHUB_*` | Empty | GitHub integration, see [github.md](github.md) |
| `COMPOSE_PROJECT_NAME` | `kaamhub` | Prefix of container and volume names. Set it to run two installations on one server |

After editing `.env`, apply the change with `docker compose up -d`. Compose recreates only the services whose settings changed.

## Use your own PostgreSQL

If you already run PostgreSQL 15 or newer, for example a managed database, you can run only the app container. Create an empty database and a user that owns it, then use this `docker-compose.yml`:

```yaml
services:
  app:
    image: ghcr.io/klixsoft/kaamhub:0.1.0
    restart: unless-stopped
    env_file: .env
    volumes:
      - app-storage:/app/storage
    ports:
      - "127.0.0.1:3000:3000"

volumes:
  app-storage:
```

Add the connection string to `.env` together with the other settings:

```
DATABASE_URL=postgres://kaamhub:password@db.example.com:5432/kaamhub
```

The app applies its migrations to that database on every start. This setup has no updater, so:

- update by changing the image tag and running `docker compose pull && docker compose up -d`;
- run the scheduled job from the host's cron, see [Scheduling the daily job](billing.md#scheduling-the-daily-job).

The same file works in Portainer, Dokploy, Coolify and other tools that deploy a Compose file. Add `DATABASE_URL` and the other variables in the tool's environment settings.

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

Project documents are stored in the `app-storage` volume. Back them up with the database:

```bash
docker compose run --rm --no-deps -u 0 -v "$PWD":/backup --entrypoint tar app czf /backup/documents-$(date +%F).tar.gz -C /app storage
```

Restore them into the volume:

```bash
docker compose run --rm --no-deps -u 0 -v "$PWD":/backup --entrypoint tar app xzf /backup/documents.tar.gz -C /app
```

Keep `.env` in a safe place too; `BETTER_AUTH_SECRET` is needed to keep existing sessions valid and `ENCRYPTION_KEY` to read environment credentials.

## Everyday commands

Run these from the KaamHub folder, for example `/opt/kaamhub`.

| Task | Command |
|---|---|
| See what is running | `docker compose ps` |
| Follow the app log | `docker compose logs -f app` |
| Restart the app | `docker compose restart app` |
| Apply `.env` changes | `docker compose up -d` |
| Stop everything, keeping data | `docker compose down` |
| Start again | `docker compose up -d` |
| Open a database shell | `docker compose exec db psql -U kaamhub kaamhub` |

`docker compose down -v` also **deletes the volumes**, which removes your database and documents. Only use it to wipe an installation.

## Troubleshooting

**`denied` or `unauthorized` when pulling images.** The images are not public. Install from an official release, or, for a fork, make both packages public in the repository's **Packages** settings or run `docker login ghcr.io` first.

**`required variable ... is missing a value: Set X in .env`.** A required line in `.env` is empty. Fill it in and run `docker compose up -d` again.

**The app restarts with `Invalid environment configuration`.** The log names each wrong value, for example a `BETTER_AUTH_SECRET` shorter than 32 characters or an `APP_URL` without `http://` or `https://`. Check it with `docker compose logs app`.

**Sign-in fails or you are sent back to the login page.** Open KaamHub at exactly `APP_URL`. Using the IP address when `APP_URL` is a domain, or `http` when it is `https`, blocks the session cookie.

**No HTTPS certificate.** Check that `COMPOSE_PROFILES=https`, that the domain's A record points to this server, and that ports 80 and 443 are open and not used by another web server. `docker compose logs caddy` shows the reason.

**`port is already allocated`.** Another program uses port 3000, 80 or 443. Change `APP_PORT`, or stop the other program.

**Credentials cannot be saved.** Set `ENCRYPTION_KEY` and run `docker compose up -d`.

**Emails do not arrive.** Without `SMTP_HOST` they are only written to `docker compose logs app`. With SMTP set, the log shows the error from your mail server.

## Uninstall

Stop and remove the containers, then remove the volumes and the folder. This permanently deletes the database and documents, so take a [backup](#backups) first.

```bash
cd /opt/kaamhub && docker compose down -v
```

```bash
rm -rf /opt/kaamhub
```

## Health check

`GET /api/health` returns `{"status":"ok","version":"x.y.z"}` when the app can reach the database. Docker uses it for the container health check.

## Publishing images

Images are built by `.github/workflows/release.yml`. The easiest way to release is from GitHub: open **Actions → Release → Run workflow**, choose `main` and enter the version, for example `0.1.0`. The workflow builds the images, then creates the `v0.1.0` tag and the release.

Pushing a version tag works too:

```bash
git tag v0.1.0
```

```bash
git push origin v0.1.0
```

The workflow publishes multi-architecture images (amd64 and arm64) to GitHub Container Registry and creates a GitHub Release with a version-pinned `install.sh` attached:

- `ghcr.io/<owner>/<repo>:<version>` and `:latest`
- `ghcr.io/<owner>/<repo>-updater:<version>` and `:latest`

Make the packages public in the repository's **Packages** settings so servers can pull them without logging in. The System page compares the running version with the latest release.
