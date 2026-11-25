"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/server/db"
import { managedServices } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { notFoundError } from "@/server/lib/errors"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { recordAudit } from "@/server/services/audit"
import { generateServiceInvoice } from "./billing"
import { serviceIdSchema, serviceSchema, serviceUpdateSchema } from "./schema"

const servicesPath = (projectId: string) => `/projects/${projectId}/services`

async function serviceProject(serviceId: string): Promise<string> {
  const [service] = await db.select({ projectId: managedServices.projectId }).from(managedServices).where(eq(managedServices.id, serviceId)).limit(1)
  if (!service) throw notFoundError("Service")
  return service.projectId
}

export const createService = formAction({
  schema: serviceSchema,
  permission: "finance:write",
  handler: async (input, { user }) => {
    await requireProjectCapability(user, input.projectId, "view")
    const [created] = await db.insert(managedServices).values(input).returning({ id: managedServices.id })
    await recordAudit({ actorId: user.id, action: "service.created", entityType: "project", entityId: input.projectId, metadata: { name: input.name } })
    revalidatePath(servicesPath(input.projectId))
    return created
  },
})

export const updateService = formAction({
  schema: serviceUpdateSchema,
  permission: "finance:write",
  handler: async ({ serviceId, projectId: _projectId, ...input }, { user }) => {
    const projectId = await serviceProject(serviceId)
    await db.update(managedServices).set(input).where(and(eq(managedServices.id, serviceId), eq(managedServices.projectId, projectId)))
    await recordAudit({ actorId: user.id, action: "service.updated", entityType: "project", entityId: projectId, metadata: { serviceId } })
    revalidatePath(servicesPath(projectId))
    return { id: serviceId }
  },
})

export const deleteService = action({
  schema: serviceIdSchema,
  permission: "finance:write",
  handler: async ({ serviceId }, { user }) => {
    const projectId = await serviceProject(serviceId)
    await db.delete(managedServices).where(eq(managedServices.id, serviceId))
    await recordAudit({ actorId: user.id, action: "service.deleted", entityType: "project", entityId: projectId, metadata: { serviceId } })
    revalidatePath(servicesPath(projectId))
    return undefined
  },
})

export const invoiceServiceNow = action({
  schema: serviceIdSchema,
  permission: "finance:write",
  handler: async ({ serviceId }, { user }) => {
    const projectId = await serviceProject(serviceId)
    const invoice = await generateServiceInvoice(serviceId, user.id)
    await recordAudit({ actorId: user.id, action: "service.invoiced", entityType: "project", entityId: projectId, metadata: { serviceId } })
    revalidatePath(servicesPath(projectId))
    revalidatePath("/invoices")
    return invoice
  },
})
