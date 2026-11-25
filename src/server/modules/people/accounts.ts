import "server-only"
import { randomBytes } from "node:crypto"
import { env } from "@/config/env"
import type { SystemRole } from "@/config/roles"
import { auth } from "@/server/auth/auth"
import { AppError } from "@/server/lib/errors"

interface NewAccount {
  name: string
  email: string
  role: SystemRole
  password?: string
  accessExpiresAt?: Date | null
}

export async function createAccount(input: NewAccount): Promise<{ id: string }> {
  const context = await auth.$context
  const email = input.email.toLowerCase()
  if (await context.internalAdapter.findUserByEmail(email)) {
    throw new AppError("A user with this email already exists.", "CONFLICT")
  }

  const user = await context.internalAdapter.createUser({
    name: input.name,
    email,
    emailVerified: Boolean(input.password),
    role: input.role,
    status: "active",
    accessExpiresAt: input.accessExpiresAt ?? null,
  }, { method: "admin" })

  const password = input.password ?? randomBytes(32).toString("base64url")
  await context.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await context.password.hash(password),
  })

  return { id: user.id }
}

export async function sendPasswordSetupEmail(email: string): Promise<void> {
  await auth.api.requestPasswordReset({ body: { email, redirectTo: `${env.APP_URL}/reset-password` } })
}

export async function revokeAllSessions(userId: string): Promise<void> {
  const context = await auth.$context
  await context.internalAdapter.deleteUserSessions(userId)
}
