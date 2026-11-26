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
| `SESSION_SECRET` | Yes | At least 32 characters: `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Yes | 64 hex characters: `openssl rand -hex 32` |
| `STORAGE_DIR` | No | Folder for uploaded project documents. Defaults to `./storage` |
| `CRON_SECRET` | No | Lets you call `POST /api/cron/daily` by hand with `Authorization: Bearer <CRON_SECRET>` |

Email and GitHub are configured in the app by a Super Admin (**Email** and **GitHub** in the sidebar). Until email is set up, every email is written to the dev server log, including invitation and password-reset links. The System page shows manual update instructions in development, because there is no updater container.

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
