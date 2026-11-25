"use server"

import { eq } from "drizzle-orm"
import { after } from "next/server"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { isAssignableRole } from "@/config/roles"
import { db } from "@/server/db"
import { memberProfiles, users } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, forbiddenError, notFoundError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { recordAudit } from "@/server/services/audit"
import { syncUserGithubAccess } from "@/server/modules/github/access-sync"
import { createAccount, revokeAllSessions, sendPasswordSetupEmail } from "./accounts"
import { type MemberInput, memberSchema, memberStatusSchema } from "./schema"

function profileValues(input: MemberInput) {
  return {
    employeeCode: input.employeeCode ?? null,
    phone: input.phone ?? null,
    engagementType: input.engagementType,
    departmentId: input.departmentId ?? null,
    designationId: input.designationId ?? null,
    managerId: input.managerId ?? null,
    joinedOn: input.joinedOn ?? null,
    engagementEndsOn: input.engagementEndsOn ?? null,
  }
}

function accessExpiry(input: MemberInput): Date | null {
  return input.role === "freelancer" && input.accessExpiresOn ? new Date(`${input.accessExpiresOn}T23:59:59`) : null
}

async function assertEmployeeCodeAvailable(code: string | null | undefined, userId?: string) {
  if (!code) return
  const existing = await db.query.memberProfiles.findFirst({
    where: (table, { eq: equals }) => equals(table.employeeCode, code),
    columns: { userId: true },
  })
  if (existing && existing.userId !== userId) throw new AppError("This employee code is already in use.", "CONFLICT")
}

export const inviteMember = formAction({
  schema: memberSchema,
  permission: "people:write",
  handler: async (input, { user }) => {
    if (!isAssignableRole(user.role, input.role)) throw forbiddenError()
    await assertEmployeeCodeAvailable(input.employeeCode)

    const account = await createAccount({ name: input.name, email: input.email, role: input.role, accessExpiresAt: accessExpiry(input) })
    await db.insert(memberProfiles).values({ userId: account.id, ...profileValues(input) })

    after(async () => {
      try {
        await sendPasswordSetupEmail(input.email)
      } catch (error) {
        logger.error("Failed to send invitation email", { error, userId: account.id })
      }
    })
    await recordAudit({ actorId: user.id, action: "member.invited", entityType: "user", entityId: account.id, metadata: { role: input.role } })
    revalidatePath("/people")
    return { id: account.id }
  },
})

const updateMemberSchema = memberSchema.safeExtend({ userId: z.string().min(1) })

export const updateMember = formAction({
  schema: updateMemberSchema,
  permission: "people:write",
  handler: async ({ userId, ...input }, { user }) => {
    const target = await db.query.users.findFirst({ where: (table, { eq: equals }) => equals(table.id, userId), columns: { role: true } })
    if (!target || target.role === "client") throw notFoundError("Member")
    if (!isAssignableRole(user.role, target.role) || !isAssignableRole(user.role, input.role)) throw forbiddenError()
    if (userId === user.id && input.role !== user.role) throw new AppError("You cannot change your own role.", "FORBIDDEN")
    await assertEmployeeCodeAvailable(input.employeeCode, userId)

    await db.transaction(async (tx) => {
      await tx.update(users).set({ name: input.name, role: input.role, accessExpiresAt: accessExpiry(input) }).where(eq(users.id, userId))
      await tx
        .insert(memberProfiles)
        .values({ userId, ...profileValues(input) })
        .onConflictDoUpdate({ target: memberProfiles.userId, set: profileValues(input) })
    })

    if (target.role !== input.role) after(() => syncUserGithubAccess(userId))
    await recordAudit({ actorId: user.id, action: "member.updated", entityType: "user", entityId: userId })
    revalidatePath("/people")
    revalidatePath(`/people/${userId}`)
    return { id: userId }
  },
})

export const setMemberStatus = action({
  schema: memberStatusSchema,
  permission: "people:write",
  handler: async ({ userId, status }, { user }) => {
    if (userId === user.id) throw new AppError("You cannot change your own status.", "FORBIDDEN")
    const target = await db.query.users.findFirst({ where: (table, { eq: equals }) => equals(table.id, userId), columns: { role: true } })
    if (!target) throw notFoundError("Member")
    if (!isAssignableRole(user.role, target.role)) throw forbiddenError()

    await db.update(users).set({ status }).where(eq(users.id, userId))
    if (status === "inactive") await revokeAllSessions(userId)
    after(() => syncUserGithubAccess(userId))

    await recordAudit({ actorId: user.id, action: `member.${status === "active" ? "activated" : "deactivated"}`, entityType: "user", entityId: userId })
    revalidatePath("/people")
    revalidatePath(`/people/${userId}`)
    return undefined
  },
})

export const resendInvitation = action({
  schema: z.object({ userId: z.string().min(1) }),
  permission: "people:write",
  handler: async ({ userId }, { user }) => {
    const target = await db.query.users.findFirst({
      where: (table, { eq: equals }) => equals(table.id, userId),
      columns: { email: true, status: true },
    })
    if (!target) throw notFoundError("Member")
    if (target.status !== "active") throw new AppError("Activate this account before sending an invitation.")
    await sendPasswordSetupEmail(target.email)
    await recordAudit({ actorId: user.id, action: "member.invitation_sent", entityType: "user", entityId: userId })
    return undefined
  },
})
