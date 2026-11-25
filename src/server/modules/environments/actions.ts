"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, type Transaction } from "@/server/db"
import { environmentCredentialAccess, environmentCredentials, projectEnvironments } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, notFoundError } from "@/server/lib/errors"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { recordAudit } from "@/server/services/audit"
import { decryptSecret, encryptSecret } from "@/server/lib/crypto"
import { loadCredentialProject, loadEnvironmentProject, projectMemberIds, readableCredential } from "./credentials"
import { checkEnvironment } from "./health"
import {
  credentialCreateSchema,
  credentialIdSchema,
  credentialUpdateSchema,
  environmentIdSchema,
  environmentSchema,
  environmentUpdateSchema,
} from "./schema"

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

async function requireCredentialManager(user: Parameters<typeof requireProjectCapability>[0], projectId: string | null) {
  if (!projectId) throw notFoundError("Environment")
  const access = await requireProjectCapability(user, projectId, "manage")
  if (access.isClientViewer) throw new AppError("Clients cannot manage credentials.", "FORBIDDEN")
  return projectId
}

async function writeAccess(tx: Transaction, credentialId: string, projectId: string, userIds: string[]) {
  const allowed = await projectMemberIds(projectId, userIds)
  if (allowed.length !== new Set(userIds).size) throw new AppError("Credentials can only be shared with members of this project.")
  await tx.delete(environmentCredentialAccess).where(eq(environmentCredentialAccess.credentialId, credentialId))
  if (allowed.length > 0) await tx.insert(environmentCredentialAccess).values(allowed.map((userId) => ({ credentialId, userId })))
}

export const createCredential = action({
  schema: credentialCreateSchema,
  module: "environments",
  handler: async ({ environmentId, secret, notes, userIds, ...fields }, { user }) => {
    const projectId = await requireCredentialManager(user, await loadEnvironmentProject(environmentId))
    const created = await db.transaction(async (tx) => {
      const [credential] = await tx
        .insert(environmentCredentials)
        .values({
          ...fields,
          environmentId,
          username: fields.username ?? null,
          loginUrl: fields.loginUrl ?? null,
          secretEncrypted: encryptSecret(secret),
          notesEncrypted: notes ? encryptSecret(notes) : null,
          createdById: user.id,
        })
        .returning({ id: environmentCredentials.id })
      if (!credential) throw new Error("Credential insert returned no row")
      await writeAccess(tx, credential.id, projectId, userIds)
      return credential
    })
    await recordAudit({ actorId: user.id, action: "credential.created", entityType: "project", entityId: projectId, metadata: { credentialId: created.id } })
    revalidatePath(environmentsPath(projectId))
    return created
  },
})

export const updateCredential = action({
  schema: credentialUpdateSchema,
  module: "environments",
  handler: async ({ credentialId, environmentId: _environmentId, secret, notes, userIds, ...fields }, { user }) => {
    const location = await loadCredentialProject(credentialId)
    const projectId = await requireCredentialManager(user, location?.projectId ?? null)
    await db.transaction(async (tx) => {
      await tx
        .update(environmentCredentials)
        .set({
          label: fields.label,
          username: fields.username ?? null,
          loginUrl: fields.loginUrl ?? null,
          notesEncrypted: notes ? encryptSecret(notes) : null,
          ...(secret ? { secretEncrypted: encryptSecret(secret) } : {}),
        })
        .where(eq(environmentCredentials.id, credentialId))
      await writeAccess(tx, credentialId, projectId, userIds)
    })
    await recordAudit({ actorId: user.id, action: "credential.updated", entityType: "project", entityId: projectId, metadata: { credentialId } })
    revalidatePath(environmentsPath(projectId))
    return undefined
  },
})

export const deleteCredential = action({
  schema: credentialIdSchema,
  module: "environments",
  handler: async ({ credentialId }, { user }) => {
    const location = await loadCredentialProject(credentialId)
    const projectId = await requireCredentialManager(user, location?.projectId ?? null)
    await db.delete(environmentCredentials).where(eq(environmentCredentials.id, credentialId))
    await recordAudit({ actorId: user.id, action: "credential.deleted", entityType: "project", entityId: projectId, metadata: { credentialId } })
    revalidatePath(environmentsPath(projectId))
    return undefined
  },
})

export const revealCredential = action({
  schema: credentialIdSchema,
  module: "environments",
  handler: async ({ credentialId }, { user }) => {
    const location = await loadCredentialProject(credentialId)
    if (!location) throw notFoundError("Credential")
    const access = await requireProjectCapability(user, location.projectId, "view")
    if (access.isClientViewer) throw notFoundError("Credential")
    const credential = await readableCredential(credentialId, { userId: user.id, canManage: access.canManage })
    if (!credential) throw notFoundError("Credential")
    await recordAudit({ actorId: user.id, action: "credential.revealed", entityType: "project", entityId: location.projectId, metadata: { credentialId } })
    return { secret: decryptSecret(credential.secretEncrypted), notes: credential.notesEncrypted ? decryptSecret(credential.notesEncrypted) : null }
  },
})
