import { and, desc, eq, gt, isNotNull, isNull, lt, ne, or, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { authRateLimits, passwordTokens, userSessions, users } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import { isUserAccessAllowed } from "./access"
import { refreshCookieValue, parseRefreshCookie, sealAccess, SESSION_IDLE_SECONDS, SESSION_MAX_SECONDS } from "./cookies"
import { hashToken, randomToken, safeEqual } from "./tokens"

const ROTATION_GRACE_MS = 60 * 1000

export interface ClientMeta {
  ipAddress: string | null
  userAgent: string | null
}

export interface IssuedTokens {
  access: string
  refresh: string | null
}

export function clientMeta(headers: Headers): ClientMeta {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return {
    ipAddress: forwarded || headers.get("x-real-ip") || null,
    userAgent: headers.get("user-agent")?.slice(0, 400) ?? null,
  }
}

const slidingExpiry = sql`least(now() + make_interval(secs => ${SESSION_IDLE_SECONDS}), ${userSessions.createdAt} + make_interval(secs => ${SESSION_MAX_SECONDS}))`

export async function createSession(userId: string, meta: ClientMeta): Promise<IssuedTokens & { sessionId: string }> {
  const token = randomToken()
  const [session] = await db
    .insert(userSessions)
    .values({
      userId,
      refreshTokenHash: hashToken(token),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      expiresAt: new Date(Date.now() + SESSION_IDLE_SECONDS * 1000),
    })
    .returning({ id: userSessions.id })
  if (!session) throw new Error("Session insert returned no row")
  return {
    sessionId: session.id,
    access: await sealAccess({ sid: session.id, uid: userId }),
    refresh: refreshCookieValue(session.id, token),
  }
}

async function isAccountAllowed(userId: string): Promise<boolean> {
  const [user] = await db.select({ status: users.status, accessExpiresAt: users.accessExpiresAt }).from(users).where(eq(users.id, userId)).limit(1)
  return Boolean(user && isUserAccessAllowed(user))
}

/*
 * Each refresh token is single use: it is swapped for a new one on every refresh.
 * Parallel requests can present the token that was just replaced, so the previous
 * token stays valid for a short grace period and only receives a new access cookie.
 * Any other reuse of an old token means it may have been copied, and the whole
 * session is revoked.
 */
export async function rotateSession(cookieValue: string | undefined, meta: ClientMeta): Promise<IssuedTokens | null> {
  const parsed = parseRefreshCookie(cookieValue)
  if (!parsed) return null
  const presentedHash = hashToken(parsed.token)
  const nextToken = randomToken()

  const [rotated] = await db
    .update(userSessions)
    .set({
      previousTokenHash: sql`${userSessions.refreshTokenHash}`,
      refreshTokenHash: hashToken(nextToken),
      rotatedAt: sql`now()`,
      lastUsedAt: sql`now()`,
      expiresAt: slidingExpiry,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    })
    .where(
      and(
        eq(userSessions.id, parsed.sessionId),
        eq(userSessions.refreshTokenHash, presentedHash),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, sql`now()`),
      ),
    )
    .returning({ userId: userSessions.userId })

  if (rotated) {
    if (!(await isAccountAllowed(rotated.userId))) {
      await revokeSession(parsed.sessionId)
      return null
    }
    return {
      access: await sealAccess({ sid: parsed.sessionId, uid: rotated.userId }),
      refresh: refreshCookieValue(parsed.sessionId, nextToken),
    }
  }

  const [session] = await db
    .select({
      userId: userSessions.userId,
      previousTokenHash: userSessions.previousTokenHash,
      rotatedAt: userSessions.rotatedAt,
      revokedAt: userSessions.revokedAt,
      expiresAt: userSessions.expiresAt,
    })
    .from(userSessions)
    .where(eq(userSessions.id, parsed.sessionId))
    .limit(1)
  if (!session || session.revokedAt || session.expiresAt <= new Date()) return null

  const withinGrace =
    session.previousTokenHash !== null &&
    safeEqual(session.previousTokenHash, presentedHash) &&
    session.rotatedAt !== null &&
    Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS
  if (withinGrace && (await isAccountAllowed(session.userId))) {
    return { access: await sealAccess({ sid: parsed.sessionId, uid: session.userId }), refresh: null }
  }

  logger.warn("Refresh token reuse detected; session revoked", { sessionId: parsed.sessionId, userId: session.userId })
  await revokeSession(parsed.sessionId)
  return null
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.update(userSessions).set({ revokedAt: sql`now()` }).where(and(eq(userSessions.id, sessionId), isNull(userSessions.revokedAt)))
}

export async function revokeOwnedSession(userId: string, sessionId: string): Promise<boolean> {
  const revoked = await db
    .update(userSessions)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(userSessions.id, sessionId), eq(userSessions.userId, userId), isNull(userSessions.revokedAt)))
    .returning({ id: userSessions.id })
  return revoked.length > 0
}

export async function revokeUserSessions(userId: string, options: { except?: string } = {}): Promise<void> {
  await db
    .update(userSessions)
    .set({ revokedAt: sql`now()` })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), options.except ? ne(userSessions.id, options.except) : undefined))
}

export async function listActiveSessions(userId: string) {
  return db
    .select({
      id: userSessions.id,
      ipAddress: userSessions.ipAddress,
      userAgent: userSessions.userAgent,
      createdAt: userSessions.createdAt,
      lastUsedAt: userSessions.lastUsedAt,
    })
    .from(userSessions)
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, sql`now()`)))
    .orderBy(desc(userSessions.lastUsedAt))
}

export type ActiveSession = Awaited<ReturnType<typeof listActiveSessions>>[number]

export async function deleteExpiredAuthRecords(): Promise<void> {
  await Promise.all([
    db.delete(userSessions).where(or(lt(userSessions.expiresAt, sql`now()`), and(isNotNull(userSessions.revokedAt), lt(userSessions.revokedAt, sql`now() - interval '7 days'`)))),
    db.delete(passwordTokens).where(lt(passwordTokens.expiresAt, sql`now()`)),
    db.delete(authRateLimits).where(lt(authRateLimits.resetAt, sql`now()`)),
  ])
}
