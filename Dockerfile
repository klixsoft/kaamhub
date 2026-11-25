# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

FROM base AS migrator-deps
COPY package-lock.json ./lock.json
COPY scripts/migrator-versions.mjs ./migrator-versions.mjs
RUN --mount=type=cache,target=/root/.npm mkdir migrator && cd migrator && npm init -y >/dev/null \
  && npm install --omit=dev --no-audit --no-fund $(node ../migrator-versions.mjs ../lock.json)

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG APP_VERSION=0.0.0-dev
ENV NODE_ENV=production \
    APP_VERSION=${APP_VERSION} \
    APP_URL=http://build.invalid \
    DATABASE_URL=postgres://build:build@127.0.0.1:1/build \
    BETTER_AUTH_SECRET=build-time-placeholder-not-used-at-runtime
RUN npm run build

FROM base AS runner
ARG APP_VERSION=0.0.0-dev
ENV NODE_ENV=production \
    APP_VERSION=${APP_VERSION} \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    MIGRATIONS_DIR=/app/drizzle

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
COPY --from=migrator-deps --chown=nextjs:nodejs /app/migrator/node_modules ./migrator/node_modules
COPY --chown=nextjs:nodejs scripts/migrate.mjs ./migrator/migrate.mjs
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1
ENTRYPOINT ["/bin/sh", "./entrypoint.sh"]
