# Development

## Requirements

- Node.js 22 or newer
- PostgreSQL 15 or newer (a local install or `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:17-alpine`)

## Setup

```bash
npm install
cp .env.example .env.local
```

Edit `.env.local`:

| Variable | Required | Notes |
|---|---|---|
| `APP_URL` | Yes | `http://localhost:3000` in development |
| `DATABASE_URL` | Yes | e.g. `postgres://user:password@localhost:5432/kaamhub` |
| `BETTER_AUTH_SECRET` | Yes | At least 32 characters: `openssl rand -base64 48` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | No | Outgoing email. Without `SMTP_HOST`, emails are written to the server log. See [Email](deployment.md#email) |
| `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_ORG`, `GITHUB_WEBHOOK_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | No | Only needed to test the GitHub integration. See [GitHub](deployment.md#github) |
| `UPDATE_REPOSITORY`, `UPDATER_URL`, `UPDATER_TOKEN` | No | Only needed for the System update page |
| `CRON_SECRET` | No | Enables `POST /api/cron/daily` for recurring invoices and renewal reminders |
| `STORAGE_DIR` | No | Folder for uploaded project documents. Defaults to `./storage` |
| `ENCRYPTION_KEY` | No | 64 hex characters (`openssl rand -hex 32`). Required to save environment credentials |

Apply migrations and start the dev server:

```bash
npm run db:migrate
npm run dev
```

The first visit redirects to `/setup`, where you create the super admin.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generates route types and runs `tsc` |
| `npm run db:generate` | Creates a SQL migration from schema changes |
| `npm run db:migrate` | Applies pending migrations |
| `npm run db:studio` | Opens Drizzle Studio |

## Changing the database schema

1. Edit the tables in `src/server/db/schema/`.
2. Run `npm run db:generate`. A new SQL file appears in `drizzle/`.
3. Review the SQL, then run `npm run db:migrate`.
4. Commit the schema change and the migration together. CI fails if they are out of sync.

Migrations run automatically when the Docker container starts.

## Testing emails locally

Invitations and password reset links are logged as JSON lines like:

```
{"level":"warn","message":"SMTP is not configured; email not sent","to":"…","body":"…/api/auth/reset-password/…"}
```

Open the link from the log to set a password.
