import "server-only"
import { and, eq, gt, sql } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { env } from "@/config/env"
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, cookieOptions, REFRESH_COOKIE, SESSION_IDLE_SECONDS } from "@/server/auth/cookies"
import { isUserAccessAllowed } from "@/server/auth/access"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { consumeRateLimit } from "@/server/auth/rate-limit"
import { clientMeta, createSession, type IssuedTokens, revokeUserSessions } from "@/server/auth/session-store"
import { hashToken, randomToken } from "@/server/auth/tokens"
import { db } from "@/server/db"
import { passwordTokens, users } from "@/server/db/schema"
import { sendMail } from "@/server/services/mailer"
import { getCompanyName } from "@/server/modules/settings/queries"

export type PasswordTokenPurpose = "invite" | "reset"

const TOKEN_LIFETIME_SECONDS: Record<PasswordTokenPurpose, number> = {
  invite: 7 * 24 * 60 * 60,
  reset: 60 * 60,
}

export async function requestMeta() {
  return clientMeta(await headers())
}

export async function setSessionCookies(tokens: IssuedTokens): Promise<void> {
  const store = await cookies()
  store.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_TTL_SECONDS))
  if (tokens.refresh) store.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(SESSION_IDLE_SECONDS))
}

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies()
  store.delete(ACCESS_COOKIE)
  store.delete(REFRESH_COOKIE)
}

export type SignInResult = { ok: true } | { ok: false; reason: "invalid" | "limited" }

export async function signInWithPassword(email: string, password: string): Promise<SignInResult> {
  const meta = await requestMeta()
  const normalizedEmail = email.trim().toLowerCase()
  const allowed = await Promise.all([
    consumeRateLimit(`sign-in:ip:${meta.ipAddress ?? "unknown"}`, 20, 60),
    consumeRateLimit(`sign-in:email:${normalizedEmail}`, 5, 60),
  ])
  if (allowed.includes(false)) return { ok: false, reason: "limited" }

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, status: users.status, accessExpiresAt: users.accessExpiresAt })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)
  const passwordMatches = await verifyPassword(user?.passwordHash ?? null, password)
  if (!user || !passwordMatches || !isUserAccessAllowed(user)) return { ok: false, reason: "invalid" }

  await setSessionCookies(await createSession(user.id, meta))
  return { ok: true }
}

export async function issuePasswordToken(userId: string, purpose: PasswordTokenPurpose): Promise<string> {
  const token = randomToken()
  await db.transaction(async (tx) => {
    await tx.delete(passwordTokens).where(eq(passwordTokens.userId, userId))
    await tx.insert(passwordTokens).values({
      userId,
      purpose,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TOKEN_LIFETIME_SECONDS[purpose] * 1000),
    })
  })
  return token
}

export async function sendPasswordEmail(userId: string, purpose: PasswordTokenPurpose): Promise<void> {
  const [user] = await db.select({ name: users.name, email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user) return
  const [token, companyName] = await Promise.all([issuePasswordToken(userId, purpose), getCompanyName()])
  const url = `${env.APP_URL}/reset-password?token=${encodeURIComponent(token)}`

  const message =
    purpose === "invite"
      ? {
          subject: `You're invited to ${companyName}`,
          text: `Hello ${user.name},\n\nYou have been invited to ${companyName} on KaamHub. Use the link below to choose your password. The link expires in 7 days.\n\n${url}\n\nIf you did not expect this email, you can ignore it.`,
        }
      : {
          subject: "Reset your password",
          text: `Hello ${user.name},\n\nUse the link below to choose a new password. The link expires in 1 hour.\n\n${url}\n\nIf you did not ask to reset your password, you can ignore this email; your password stays the same.`,
        }
  await sendMail({ to: user.email, ...message })
}

export async function requestPasswordReset(email: string): Promise<"sent" | "limited"> {
  const meta = await requestMeta()
  const normalizedEmail = email.trim().toLowerCase()
  const allowed = await Promise.all([
    consumeRateLimit(`reset:ip:${meta.ipAddress ?? "unknown"}`, 5, 60),
    consumeRateLimit(`reset:email:${normalizedEmail}`, 3, 60 * 60),
  ])
  if (allowed.includes(false)) return "limited"

  const [user] = await db
    .select({ id: users.id, status: users.status, accessExpiresAt: users.accessExpiresAt })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1)
  if (user && isUserAccessAllowed(user)) await sendPasswordEmail(user.id, "reset")
  return "sent"
}

export async function resetPasswordWithToken(token: string, password: string): Promise<"done" | "invalid" | "limited"> {
  const meta = await requestMeta()
  if (!(await consumeRateLimit(`reset-token:ip:${meta.ipAddress ?? "unknown"}`, 10, 60))) return "limited"

  const passwordHash = await hashPassword(password)
  const userId = await db.transaction(async (tx) => {
    const [consumed] = await tx
      .delete(passwordTokens)
      .where(and(eq(passwordTokens.tokenHash, hashToken(token)), gt(passwordTokens.expiresAt, sql`now()`)))
      .returning({ userId: passwordTokens.userId })
    if (!consumed) return null
    await tx.update(users).set({ passwordHash }).where(eq(users.id, consumed.userId))
    await tx.delete(passwordTokens).where(eq(passwordTokens.userId, consumed.userId))
    return consumed.userId
  })
  if (!userId) return "invalid"
  await revokeUserSessions(userId)
  return "done"
}

export async function changePassword(userId: string, currentSessionId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const [user] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1)
  if (!user || !(await verifyPassword(user.passwordHash, currentPassword))) return false
  await db.update(users).set({ passwordHash: await hashPassword(newPassword) }).where(eq(users.id, userId))
  await revokeUserSessions(userId, { except: currentSessionId })
  return true
}
