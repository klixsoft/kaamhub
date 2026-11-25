"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/server/db"
import { projectEnvironments } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, notFoundError } from "@/server/lib/errors"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { recordAudit } from "@/server/services/audit"
import { checkEnvironment } from "./health"
import { environmentIdSchema, environmentSchema, environmentUpdateSchema } from "./schema"

const environmentsPath = (projectId: string) => `/projects/${projectId}/environments`

async function loadEnvironment(environmentId: string) {
  const [environment] = await db
    .select({ projectId: projectEnvironments.projectId, url: projectEnvironments.url })
    .from(projectEnvironments)
    .where(eq(projectEnvironments.id, environmentId))
    .limit(1)
  if (!environment) throw notFoundError("Environment")
  return environment
}

export const createEnvironment = formAction({
  schema: environmentSchema,
  module: "environments",
  handler: async (input, { user }) => {
    await requireProjectCapability(user, input.projectId, "manage")
    const [created] = await db.insert(projectEnvironments).values(input).returning({ id: projectEnvironments.id })
    if (created && input.url) await checkEnvironment(created.id, input.url)
    await recordAudit({ actorId: user.id, action: "environment.created", entityType: "project", entityId: input.projectId, metadata: { name: input.name } })
    revalidatePath(environmentsPath(input.projectId))
    return created
  },
})

export const updateEnvironment = formAction({
  schema: environmentUpdateSchema,
  module: "environments",
  handler: async ({ environmentId, projectId: _projectId, ...input }, { user }) => {
    const { projectId } = await loadEnvironment(environmentId)
    await requireProjectCapability(user, projectId, "manage")
    await db.update(projectEnvironments).set(input).where(eq(projectEnvironments.id, environmentId))
    if (input.url) await checkEnvironment(environmentId, input.url)
    await recordAudit({ actorId: user.id, action: "environment.updated", entityType: "project", entityId: projectId, metadata: { environmentId } })
    revalidatePath(environmentsPath(projectId))
    return { id: environmentId }
  },
})

export const deleteEnvironment = action({
  schema: environmentIdSchema,
  module: "environments",
  handler: async ({ environmentId }, { user }) => {
    const { projectId } = await loadEnvironment(environmentId)
    await requireProjectCapability(user, projectId, "manage")
    await db.delete(projectEnvironments).where(eq(projectEnvironments.id, environmentId))
    await recordAudit({ actorId: user.id, action: "environment.deleted", entityType: "project", entityId: projectId, metadata: { environmentId } })
    revalidatePath(environmentsPath(projectId))
    return undefined
  },
})

export const checkEnvironmentNow = action({
  schema: environmentIdSchema,
  module: "environments",
  handler: async ({ environmentId }, { user }) => {
    const environment = await loadEnvironment(environmentId)
    await requireProjectCapability(user, environment.projectId, "view")
    if (!environment.url) throw new AppError("Add a URL to check this environment.")
    const result = await checkEnvironment(environmentId, environment.url)
    revalidatePath(environmentsPath(environment.projectId))
    return result
  },
})
