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

The installer writes every setting to `/opt/kaamhub/.env`. Edit it to finish the [email settings](#email) (`SMTP_USER`, `SMTP_PASSWORD` and `SMTP_FROM`) and, if you use it, the [GitHub](#github) settings. Then apply them:

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

### 5. Set up email

KaamHub sends invitations, password resets, invoices and renewal reminders by email. Fill in these lines with the details from your email provider; see [Email](#email) for what each one means and examples for common providers.

```
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM="Acme Software <no-reply@example.com>"
```

You can skip this for a first try: without `SMTP_HOST`, emails are not sent and their content is written to the app log (`docker compose logs app`) instead.

The GitHub integration is optional and can be added any time; see [GitHub](#github) and [github.md](github.md).

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

All settings live in `.env`, next to `docker-compose.yml`. Docker Compose reads the file to fill in `docker-compose.yml`, and passes every line to the app container. After changing it, apply the change with:

```bash
docker compose up -d
```

Compose recreates only the containers whose settings changed. Values with spaces must be wrapped in double quotes, for example `SMTP_FROM="Acme Software <no-reply@example.com>"`.

### Images and versions

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_IMAGE` | Yes | None | Image of the application. Use `ghcr.io/klixsoft/kaamhub`, or your fork's image if you build your own |
| `APP_TAG` | No | `latest` | Version of the application image, for example `0.1.0`. One-click updates change this line for you |
| `UPDATER_IMAGE` | Yes | None | Image of the updater, `ghcr.io/klixsoft/kaamhub-updater` |
| `UPDATER_TAG` | No | `latest` | Version of the updater image. The updater rarely changes; `latest` is fine |
| `COMPOSE_PROJECT_NAME` | No | `kaamhub` | Prefix for container, network and volume names. Give each installation its own name to run two on one server |

### Address and network

| Variable | Required | Default | Description |
|---|---|---|---|
| `APP_URL` | Yes | None | The full address people open KaamHub at, for example `https://hub.example.com` or `http://203.0.113.10:3000`. Used in email links, and sign-in is only accepted from this address. Cookies are marked secure when it starts with `https://` |
| `COMPOSE_PROFILES` | No | Empty | Set to `https` to start the bundled Caddy server, which serves `DOMAIN` with automatic certificates. Leave empty when you use your own reverse proxy or no domain |
| `DOMAIN` | With `https` profile | `localhost` | Domain name Caddy serves and requests a Let's Encrypt certificate for, without `https://`, for example `hub.example.com`. Its DNS A record must point to the server |
| `APP_BIND` | No | `127.0.0.1` | Host address the app's port is opened on. `127.0.0.1` allows only Caddy or a reverse proxy on the same server to reach it. `0.0.0.0` opens it to the internet, needed only when you use no proxy |
| `APP_PORT` | No | `3000` | Host port for the app. Change it if 3000 is already used |

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Yes | None | Password for the bundled PostgreSQL. Generate it with `openssl rand -hex 24`. It is set when the database is first created; changing it in `.env` later does not change the existing database password |
| `POSTGRES_DB` | No | `kaamhub` | Name of the database |
| `POSTGRES_USER` | No | `kaamhub` | Database user |
| `DATABASE_POOL_MAX` | No | `10` | Maximum database connections the app opens. The default suits most teams |
| `DATABASE_URL` | Only with your own database | Set by `docker-compose.yml` | Connection string, for example `postgres://kaamhub:password@db.example.com:5432/kaamhub`. With the bundled database it is built from the three `POSTGRES_` values; see [Use your own PostgreSQL](#use-your-own-postgresql) otherwise |

### Security keys

Generate every key with the command shown, and keep a copy of `.env` in a safe place.

| Variable | Required | Generate with | Description |
|---|---|---|---|
| `BETTER_AUTH_SECRET` | Yes | `openssl rand -hex 32` | Signs sign-in sessions. At least 32 characters. Changing it signs everyone out |
| `ENCRYPTION_KEY` | Recommended | `openssl rand -hex 32` | Encrypts environment credentials (passwords and notes). Must be 64 hex characters, or 32 bytes in base64. Without it, credentials cannot be saved. Never change or lose it once credentials exist: they cannot be decrypted with another key |
| `UPDATER_TOKEN` | Yes | `openssl rand -hex 32` | Shared secret the app uses to ask the updater to install a new version |
| `CRON_SECRET` | Recommended | `openssl rand -hex 32` | Protects the scheduled job at `POST /api/cron/daily`. When set, the updater calls the job every hour to create recurring invoice drafts, send renewal reminders and check environment uptime. Without it, none of these run |

### Email

Without `SMTP_HOST`, KaamHub does not send email and writes each message to the app log instead. Invitations and password resets then only work if you copy the link from the log.

| Variable | Required | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | To send email | Empty | Your provider's SMTP server, for example `smtp.gmail.com` |
| `SMTP_PORT` | No | `587` | SMTP port. `587` uses STARTTLS, `465` uses TLS from the start |
| `SMTP_SECURE` | No | `false` | `true` for port `465`, `false` for port `587` (the connection is still upgraded to TLS by STARTTLS) |
| `SMTP_USER` | Usually | Empty | User name for the SMTP server, often your email address or an API user. Leave empty only if the server accepts mail without signing in |
| `SMTP_PASSWORD` | With `SMTP_USER` | Empty | Password or API key for `SMTP_USER`. With Gmail, and with Microsoft 365 accounts that use two-step sign-in, create an app password instead of using your normal password |
| `SMTP_FROM` | To send email | Empty | Sender shown on every email, for example `"Acme Software <no-reply@example.com>"`. Use an address your provider allows you to send from |

Settings for common providers:

| Provider | `SMTP_HOST` | `SMTP_PORT` | `SMTP_SECURE` | `SMTP_USER` |
|---|---|---|---|---|
| Gmail / Google Workspace | `smtp.gmail.com` | `587` | `false` | Your email address (with an app password) |
| Microsoft 365 / Outlook | `smtp.office365.com` | `587` | `false` | Your email address |
| Amazon SES | `email-smtp.<region>.amazonaws.com` | `587` | `false` | SES SMTP user name |
| SendGrid | `smtp.sendgrid.net` | `587` | `false` | `apikey` (the password is your API key) |
| Mailgun | `smtp.mailgun.org` | `587` | `false` | Your Mailgun SMTP login |
| Zoho Mail | `smtp.zoho.com` | `465` | `true` | Your email address |

To test, invite a person from **People**: the invitation should arrive within a minute. If it does not, `docker compose logs app` shows the error from your mail server.

### Updates

| Variable | Required | Default | Description |
|---|---|---|---|
| `UPDATE_REPOSITORY` | No | Empty | GitHub repository whose releases the **System** page checks for new versions, in `owner/repo` form. Use `klixsoft/kaamhub`, or your fork. When empty, KaamHub does not check for updates |

### GitHub

Optional. Fill these in only if you use the GitHub module; [github.md](github.md) explains how to create the GitHub App and where each value comes from.

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | The App ID shown on your GitHub App's settings page |
| `GITHUB_APP_PRIVATE_KEY` | The private key (`.pem`) generated for the app, on one line with `\n` for each line break |
| `GITHUB_APP_INSTALLATION_ID` | The number at the end of the URL after installing the app in your organisation |
| `GITHUB_ORG` | Your GitHub organisation's login, for example `acme` |
| `GITHUB_WEBHOOK_SECRET` | The webhook secret you entered when creating the app |
| `GITHUB_CLIENT_ID` | The app's Client ID, used for **Connect GitHub** on each person's profile |
| `GITHUB_CLIENT_SECRET` | A client secret generated on the app's settings page |

The app manages repositories only when `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID` and `GITHUB_ORG` are all set. **Connect GitHub** appears when `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` are set.

### Set by the image or Compose file

You do not put these in `.env` when you use the provided `docker-compose.yml`:

| Variable | Value | Description |
|---|---|---|
| `DATABASE_URL` | `postgres://<user>:<password>@db:5432/<db>` | Points the app at the bundled database |
| `UPDATER_URL` | `http://updater:9000` | Where the app reaches the updater on the private network |
| `STORAGE_DIR` | `/app/storage` | Folder for uploaded documents, stored in the `app-storage` volume |
| `PORT` | `3000` | Port the app listens on inside the container |
| `APP_VERSION` | The image version | Shown on the System page and by `/api/health` |

## Complete example files

### docker-compose.yml

This is the `docker-compose.yml` shipped with KaamHub. Download it from the release you install rather than copying it from here, so it always matches the images.

```yaml
name: ${COMPOSE_PROJECT_NAME:-kaamhub}

services:
  db:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-kaamhub}
      POSTGRES_USER: ${POSTGRES_USER:-kaamhub}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    volumes:
      - db-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [internal]

  app:
    image: ${APP_IMAGE:?Set APP_IMAGE in .env}:${APP_TAG:-latest}
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    env_file: .env
    environment:
      DATABASE_URL: postgres://${POSTGRES_USER:-kaamhub}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB:-kaamhub}
      UPDATER_URL: http://updater:9000
    volumes:
      - app-storage:/app/storage
    ports:
      - "${APP_BIND:-127.0.0.1}:${APP_PORT:-3000}:3000"
    networks: [internal]

  updater:
    image: ${UPDATER_IMAGE:?Set UPDATER_IMAGE in .env}:${UPDATER_TAG:-latest}
    restart: unless-stopped
    environment:
      UPDATER_TOKEN: ${UPDATER_TOKEN:?Set UPDATER_TOKEN in .env}
      COMPOSE_PROJECT_NAME: ${COMPOSE_PROJECT_NAME:-kaamhub}
      COMPOSE_FILE: /stack/docker-compose.yml
      ENV_FILE: /stack/.env
      APP_SERVICE: app
      CRON_URL: http://app:3000/api/cron/daily
      CRON_SECRET: ${CRON_SECRET:-}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./:/stack
    networks: [internal]

  caddy:
    image: caddy:2-alpine
    profiles: [https]
    restart: unless-stopped
    depends_on: [app]
    environment:
      DOMAIN: ${DOMAIN:-localhost}
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
    networks: [internal]

volumes:
  db-data:
  app-storage:
  caddy-data:
  caddy-config:

networks:
  internal:
```

What each part does:

- **`db`** runs PostgreSQL 17. Its data lives in the `db-data` volume, and `healthcheck` makes the app wait until the database accepts connections.
- **`app`** runs KaamHub from `APP_IMAGE:APP_TAG`. `env_file: .env` passes all your settings to it; `DATABASE_URL` and `UPDATER_URL` are added on top. Uploaded documents are kept in the `app-storage` volume. The app is published on `APP_BIND:APP_PORT`, `127.0.0.1:3000` by default.
- **`updater`** gets the Docker socket and your folder (`./` mounted as `/stack`) so it can change `APP_TAG` in `.env` and restart the app when an admin clicks **Update**. It also calls the scheduled job every hour when `CRON_SECRET` is set. It has no host port.
- **`caddy`** only starts with `COMPOSE_PROFILES=https`. It serves `DOMAIN` on ports 80 and 443, gets certificates automatically and keeps them in the `caddy-data` volume.
- **`volumes`** hold everything worth backing up: `db-data` and `app-storage`.

The bundled `Caddyfile` is three lines:

```
{$DOMAIN} {
	encode zstd gzip
	reverse_proxy app:3000
}
```

### .env

A complete `.env` for a server at `hub.example.com` with automatic HTTPS and email through Gmail. Every value in angle brackets is yours to replace; generate each secret with the command next to it.

```
APP_IMAGE=ghcr.io/klixsoft/kaamhub
APP_TAG=0.1.0
UPDATER_IMAGE=ghcr.io/klixsoft/kaamhub-updater
UPDATER_TAG=latest

COMPOSE_PROFILES=https
DOMAIN=hub.example.com
APP_URL=https://hub.example.com
APP_BIND=127.0.0.1
APP_PORT=3000

POSTGRES_DB=kaamhub
POSTGRES_USER=kaamhub
POSTGRES_PASSWORD=<openssl rand -hex 24>

BETTER_AUTH_SECRET=<openssl rand -hex 32>
ENCRYPTION_KEY=<openssl rand -hex 32>
UPDATER_TOKEN=<openssl rand -hex 32>
CRON_SECRET=<openssl rand -hex 32>

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<no-reply@example.com>
SMTP_PASSWORD=<Google app password>
SMTP_FROM="Acme Software <no-reply@example.com>"

UPDATE_REPOSITORY=klixsoft/kaamhub

GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_INSTALLATION_ID=
GITHUB_ORG=
GITHUB_WEBHOOK_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

For your own reverse proxy instead of Caddy, change the HTTPS lines to `COMPOSE_PROFILES=` and `DOMAIN=` and keep `APP_URL` as your public address. For a server without a domain, also set `APP_BIND=0.0.0.0` and `APP_URL=http://<server-ip>:3000`.

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
