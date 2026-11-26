"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { safeRedirectPath } from "@/lib/safe-redirect"
import { getCurrentSession } from "@/server/auth/session"
import { revokeOwnedSession, revokeSession, revokeUserSessions } from "@/server/auth/session-store"
import { action } from "@/server/lib/action"
import { notFoundError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { passwordSchema } from "@/server/modules/people/schema"
import { recordAudit } from "@/server/services/audit"
import type { ActionResult } from "@/types/action"
import { changePassword as changeStoredPassword, clearSessionCookies, requestPasswordReset as requestReset, resetPasswordWithToken, signInWithPassword } from "./service"

const signInSchema = z.object({
  email: z.email("Enter a valid email address").max(254),
  password: z.string().min(1, "Enter your password").max(128),
  next: z.string().optional(),
})

export async function signIn(_previous: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: "Enter your email and password." }

  let result: Awaited<ReturnType<typeof signInWithPassword>>
  try {
    result = await signInWithPassword(parsed.data.email, parsed.data.password)
  } catch (error) {
    logger.error("Sign-in failed", { error })
    return { ok: false, error: "We couldn’t sign you in right now. Please try again in a moment." }
  }
  if (!result.ok) {
    return {
      ok: false,
      error: result.reason === "limited" ? "Too many attempts. Please wait a minute and try again." : "The email or password is incorrect, or your account is not active.",
    }
  }
  redirect(safeRedirectPath(parsed.data.next, "/dashboard"))
}

export async function signOut(): Promise<void> {
  const session = await getCurrentSession()
  if (session) await revokeSession(session.sessionId)
  await clearSessionCookies()
  redirect("/login")
}

export async function requestPasswordReset(_previous: unknown, formData: FormData): Promise<ActionResult<"sent" | "limited">> {
  const parsed = z.object({ email: z.email("Enter a valid email address").max(254) }).safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." }
  try {
    return { ok: true, data: await requestReset(parsed.data.email) }
  } catch (error) {
    logger.error("Password reset request failed", { error })
    return { ok: false, error: "We couldn’t send the email right now. Please try again in a moment." }
  }
}

const resetSchema = z
  .object({ token: z.string().min(20).max(200), password: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, { message: "The passwords do not match.", path: ["confirmPassword"] })

export async function resetPassword(_previous: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }
  const outcome = await resetPasswordWithToken(parsed.data.token, parsed.data.password)
  if (outcome === "limited") return { ok: false, error: "Too many attempts. Please wait a minute and try again." }
  if (outcome === "invalid") return { ok: false, error: "This link is invalid or has expired. Request a new one." }
  redirect("/login?reset=1")
}

const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1, "Enter your current password").max(128), newPassword: passwordSchema, confirmPassword: z.string() })
  .refine((value) => value.newPassword === value.confirmPassword, { message: "The new passwords do not match.", path: ["confirmPassword"] })

export async function changePassword(_previous: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }
  const session = await getCurrentSession()
  if (!session) return { ok: false, error: "Your session has expired. Please sign in again." }
  if (!(await changeStoredPassword(session.user.id, session.sessionId, parsed.data.currentPassword, parsed.data.newPassword))) {
    return { ok: false, error: "Your current password is incorrect.", fieldErrors: { currentPassword: ["Your current password is incorrect."] } }
  }
  await recordAudit({ actorId: session.user.id, action: "profile.password_changed", entityType: "user", entityId: session.user.id })
  return { ok: true, data: undefined }
}

export const endSession = action({
  schema: z.object({ sessionId: z.uuid() }),
  handler: async ({ sessionId }, { user }) => {
    if (!(await revokeOwnedSession(user.id, sessionId))) throw notFoundError("Session")
    await recordAudit({ actorId: user.id, action: "profile.session_revoked", entityType: "user", entityId: user.id })
    revalidatePath("/profile")
    return undefined
  },
})

export const endOtherSessions = action({
  schema: z.object({}),
  handler: async (_input, { user }) => {
    const session = await getCurrentSession()
    await revokeUserSessions(user.id, { except: session?.sessionId })
    await recordAudit({ actorId: user.id, action: "profile.sessions_revoked", entityType: "user", entityId: user.id })
    revalidatePath("/profile")
    return undefined
  },
})
