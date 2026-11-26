import "server-only"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import type { SystemRole } from "@/config/roles"
import { hashPassword } from "@/server/auth/password"
import { revokeUserSessions } from "@/server/auth/session-store"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { AppError } from "@/server/lib/errors"
import { sendPasswordEmail } from "@/server/modules/auth/service"

interface NewAccount {
  name: string
  email: string
  role: SystemRole
  password?: string
  accessExpiresAt?: Date | null
}

export async function createAccount(input: NewAccount): Promise<{ id: string }> {
  const email = input.email.trim().toLowerCase()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (existing) throw new AppError("A user with this email already exists.", "CONFLICT")

  const [created] = await db
    .insert(users)
    .values({
      id: randomUUID(),
      name: input.name,
      email,
      role: input.role,
      status: "active",
      accessExpiresAt: input.accessExpiresAt ?? null,
      passwordHash: input.password ? await hashPassword(input.password) : null,
    })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id })
  if (!created) throw new AppError("A user with this email already exists.", "CONFLICT")
  return created
}

export async function sendInvitation(userId: string): Promise<void> {
  await sendPasswordEmail(userId, "invite")
}

export async function revokeAllSessions(userId: string): Promise<void> {
  await revokeUserSessions(userId)
}
