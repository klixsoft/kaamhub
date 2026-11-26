import { randomUUID } from "node:crypto"
import { eq, sql } from "drizzle-orm"
import { afterAll, beforeEach, describe, expect, it } from "vitest"
import { consumeRateLimit } from "@/server/auth/rate-limit"
import { createSession, listActiveSessions, revokeOwnedSession, revokeUserSessions, rotateSession } from "@/server/auth/session-store"
import { readAccess } from "@/server/auth/cookies"
import { db } from "@/server/db"
import { authRateLimits, userSessions, users } from "@/server/db/schema"

const meta = { ipAddress: "203.0.113.7", userAgent: "vitest" }
const createdUsers: string[] = []

async function createUser(overrides: Partial<typeof users.$inferInsert> = {}) {
  const id = randomUUID()
  await db.insert(users).values({ id, name: "Test Person", email: `${id}@test.invalid`, role: "employee", status: "active", ...overrides })
  createdUsers.push(id)
  return id
}

afterAll(async () => {
  for (const id of createdUsers) await db.delete(users).where(eq(users.id, id))
  await db.execute(sql`delete from auth_rate_limit where key like 'test:%'`)
})

describe("session rotation", () => {
  let userId: string
  beforeEach(async () => {
    userId = await createUser()
  })

  it("issues an access cookie for the new session", async () => {
    const session = await createSession(userId, meta)
    expect(await readAccess(session.access)).toEqual({ sid: session.sessionId, uid: userId })
    expect(session.refresh?.startsWith(`${session.sessionId}.`)).toBe(true)
  })

  it("stores only a hash of the refresh token", async () => {
    const session = await createSession(userId, meta)
    const token = session.refresh?.split(".")[1] ?? ""
    const [row] = await db.select().from(userSessions).where(eq(userSessions.id, session.sessionId))
    expect(row?.refreshTokenHash).not.toContain(token)
    expect(row?.refreshTokenHash).toHaveLength(64)
  })

  it("replaces the refresh token every time it is used", async () => {
    const session = await createSession(userId, meta)
    const first = await rotateSession(session.refresh ?? "", meta)
    const second = await rotateSession(first?.refresh ?? "", meta)
    expect(first?.refresh).toBeTruthy()
    expect(second?.refresh).toBeTruthy()
    expect(new Set([session.refresh, first?.refresh, second?.refresh]).size).toBe(3)
  })

  it("lets a parallel request reuse the just-replaced token without rotating again", async () => {
    const session = await createSession(userId, meta)
    const rotated = await rotateSession(session.refresh ?? "", meta)
    const parallel = await rotateSession(session.refresh ?? "", meta)
    expect(parallel).not.toBeNull()
    expect(parallel?.refresh).toBeNull()
    expect(await rotateSession(rotated?.refresh ?? "", meta)).not.toBeNull()
  })

  it("revokes the session when an old token is reused after the grace period", async () => {
    const session = await createSession(userId, meta)
    const rotated = await rotateSession(session.refresh ?? "", meta)
    await db.update(userSessions).set({ rotatedAt: sql`now() - interval '5 minutes'` }).where(eq(userSessions.id, session.sessionId))
    expect(await rotateSession(session.refresh ?? "", meta)).toBeNull()
    expect(await rotateSession(rotated?.refresh ?? "", meta)).toBeNull()
  })

  it("rejects forged, expired and revoked sessions", async () => {
    const session = await createSession(userId, meta)
    expect(await rotateSession(`${session.sessionId}.${"x".repeat(43)}`, meta)).toBeNull()

    const expired = await createSession(userId, meta)
    await db.update(userSessions).set({ expiresAt: sql`now() - interval '1 second'` }).where(eq(userSessions.id, expired.sessionId))
    expect(await rotateSession(expired.refresh ?? "", meta)).toBeNull()

    const revoked = await createSession(userId, meta)
    await revokeOwnedSession(userId, revoked.sessionId)
    expect(await rotateSession(revoked.refresh ?? "", meta)).toBeNull()
  })

  it("never refreshes a deactivated account or expired freelancer access", async () => {
    const session = await createSession(userId, meta)
    await db.update(users).set({ status: "inactive" }).where(eq(users.id, userId))
    expect(await rotateSession(session.refresh ?? "", meta)).toBeNull()

    const freelancer = await createUser({ role: "freelancer", accessExpiresAt: new Date(Date.now() - 1000) })
    const freelancerSession = await createSession(freelancer, meta)
    expect(await rotateSession(freelancerSession.refresh ?? "", meta)).toBeNull()
  })

  it("caps the session at 90 days even when it is used every day", async () => {
    const session = await createSession(userId, meta)
    await db.update(userSessions).set({ createdAt: sql`now() - interval '89 days 23 hours'` }).where(eq(userSessions.id, session.sessionId))
    await rotateSession(session.refresh ?? "", meta)
    const [row] = await db.select({ expiresAt: userSessions.expiresAt }).from(userSessions).where(eq(userSessions.id, session.sessionId))
    expect((row?.expiresAt.getTime() ?? 0) - Date.now()).toBeLessThan(2 * 60 * 60 * 1000)
  })
})

describe("revoking sessions", () => {
  it("signs out other devices but keeps the current one", async () => {
    const userId = await createUser()
    const current = await createSession(userId, meta)
    await createSession(userId, meta)
    await createSession(userId, meta)
    await revokeUserSessions(userId, { except: current.sessionId })
    expect((await listActiveSessions(userId)).map((session) => session.id)).toEqual([current.sessionId])
  })

  it("only lets people revoke their own sessions", async () => {
    const owner = await createUser()
    const other = await createUser()
    const session = await createSession(owner, meta)
    expect(await revokeOwnedSession(other, session.sessionId)).toBe(false)
    expect(await revokeOwnedSession(owner, session.sessionId)).toBe(true)
  })
})

describe("rate limits", () => {
  it("allows the limit and blocks the next attempt", async () => {
    const key = `test:${randomUUID()}`
    const results = []
    for (let attempt = 0; attempt < 4; attempt++) results.push(await consumeRateLimit(key, 3, 60))
    expect(results).toEqual([true, true, true, false])
  })

  it("starts a new window once the old one has passed", async () => {
    const key = `test:${randomUUID()}`
    for (let attempt = 0; attempt < 3; attempt++) await consumeRateLimit(key, 3, 60)
    await db.update(authRateLimits).set({ resetAt: sql`now() - interval '1 second'` }).where(eq(authRateLimits.key, key))
    expect(await consumeRateLimit(key, 3, 60)).toBe(true)
  })

  it("counts concurrent attempts atomically", async () => {
    const key = `test:${randomUUID()}`
    const results = await Promise.all(Array.from({ length: 10 }, () => consumeRateLimit(key, 5, 60)))
    expect(results.filter(Boolean)).toHaveLength(5)
  })
})
