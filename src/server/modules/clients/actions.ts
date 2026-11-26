"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { db } from "@/server/db"
import { clientContacts, clients, users } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { notFoundError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { createAccount, revokeAllSessions, sendInvitation } from "@/server/modules/people/accounts"
import { recordAudit } from "@/server/services/audit"
import { clientContactSchema, clientSchema } from "./schema"

export const createClient = formAction({
  schema: clientSchema,
  permission: "clients:write",
  module: "clients",
  handler: async (input, { user }) => {
    const [created] = await db.insert(clients).values(input).returning({ id: clients.id })
    if (!created) throw new Error("Client insert returned no row")
    await recordAudit({ actorId: user.id, action: "client.created", entityType: "client", entityId: created.id })
    revalidatePath("/clients")
    return created
  },
})

export const updateClient = formAction({
  schema: clientSchema.safeExtend({ clientId: z.uuid() }),
  permission: "clients:write",
  module: "clients",
  handler: async ({ clientId, ...input }, { user }) => {
    const [updated] = await db.update(clients).set(input).where(eq(clients.id, clientId)).returning({ id: clients.id })
    if (!updated) throw notFoundError("Client")
    await recordAudit({ actorId: user.id, action: "client.updated", entityType: "client", entityId: clientId })
    revalidatePath("/clients")
    revalidatePath(`/clients/${clientId}`)
    return updated
  },
})

export const addClientContact = formAction({
  schema: clientContactSchema,
  permission: "clients:write",
  module: "clients",
  handler: async ({ clientId, name, email, jobTitle }, { user }) => {
    const client = await db.query.clients.findFirst({ where: (table, { eq: equals }) => equals(table.id, clientId), columns: { id: true } })
    if (!client) throw notFoundError("Client")

    const account = await createAccount({ name, email, role: "client" })
    await db.insert(clientContacts).values({ clientId, userId: account.id, jobTitle: jobTitle ?? null })
    after(async () => {
      try {
        await sendInvitation(account.id)
      } catch (error) {
        logger.error("Failed to send client portal invitation", { error, userId: account.id })
      }
    })
    await recordAudit({ actorId: user.id, action: "client.contact_added", entityType: "client", entityId: clientId, metadata: { userId: account.id } })
    revalidatePath(`/clients/${clientId}`)
    return { id: account.id }
  },
})

export const setClientContactAccess = action({
  schema: z.object({ clientId: z.uuid(), userId: z.string().min(1), status: z.enum(["active", "inactive"]) }),
  permission: "clients:write",
  module: "clients",
  handler: async ({ clientId, userId, status }, { user }) => {
    const contact = await db.query.clientContacts.findFirst({
      where: (table, { and: both, eq: equals }) => both(equals(table.clientId, clientId), equals(table.userId, userId)),
      columns: { userId: true },
    })
    if (!contact) throw notFoundError("Contact")
    await db.update(users).set({ status }).where(eq(users.id, userId))
    if (status === "inactive") await revokeAllSessions(userId)
    await recordAudit({ actorId: user.id, action: `client.contact_${status}`, entityType: "client", entityId: clientId, metadata: { userId } })
    revalidatePath(`/clients/${clientId}`)
    return undefined
  },
})
