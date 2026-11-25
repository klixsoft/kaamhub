"use server"

import { and, eq, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { DEFAULT_BOARD_COLUMNS } from "@/config/domain"
import { can } from "@/server/auth/session"
import { db } from "@/server/db"
import { boardColumns, clients, projectMembers, projectRepositories, projects, users } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, forbiddenError, notFoundError } from "@/server/lib/errors"
import { syncProjectGithubAccess } from "@/server/modules/github/access-sync"
import { createOrganizationRepository } from "@/server/modules/github/repositories"
import { recordAudit } from "@/server/services/audit"
import { requireProjectCapability } from "./guard"
import {
  memberAssignmentSchema,
  memberRemovalSchema,
  type ProjectInput,
  projectSchema,
  repositoryCreateSchema,
  repositoryLinkSchema,
  repositoryUnlinkSchema,
} from "./schema"

async function assertCodeAvailable(code: string, projectId?: string) {
  const [existing] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.code, code), projectId ? ne(projects.id, projectId) : undefined))
    .limit(1)
  if (existing) throw new AppError("Another project already uses this code.", "CONFLICT")
}

async function assertClientExists(clientId: string | null | undefined) {
  if (!clientId) return
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).limit(1)
  if (!client) throw notFoundError("Client")
}

async function assertInternalActiveUser(userId: string) {
  const [target] = await db.select({ role: users.role, status: users.status }).from(users).where(eq(users.id, userId)).limit(1)
  if (!target || target.role === "client") throw new AppError("Only internal team members can join a project.")
  if (target.status !== "active") throw new AppError("This person's account is inactive.")
}

function projectValues({ managerId: _managerId, ...input }: ProjectInput) {
  return { ...input, description: input.description ?? null, clientId: input.clientId ?? null }
}

const syncLater = (projectId: string, extra?: Parameters<typeof syncProjectGithubAccess>[1]) =>
  after(() => syncProjectGithubAccess(projectId, extra))

export const createProject = formAction({
  schema: projectSchema,
  permission: "projects:create",
  handler: async (input, { user }) => {
    await Promise.all([assertCodeAvailable(input.code), assertClientExists(input.clientId)])
    if (input.managerId) await assertInternalActiveUser(input.managerId)

    const project = await db.transaction(async (tx) => {
      const [created] = await tx.insert(projects).values({ ...projectValues(input), createdById: user.id }).returning({ id: projects.id })
      if (!created) throw new Error("Project insert returned no row")
      await tx.insert(boardColumns).values(DEFAULT_BOARD_COLUMNS.map((column, index) => ({ ...column, projectId: created.id, position: index })))
      const managers = new Set([input.managerId, can(user, "projects:manage_all") ? null : user.id].filter((id): id is string => Boolean(id)))
      if (managers.size > 0) {
        await tx.insert(projectMembers).values([...managers].map((userId) => ({ projectId: created.id, userId, role: "manager" as const })))
      }
      return created
    })

    await recordAudit({ actorId: user.id, action: "project.created", entityType: "project", entityId: project.id })
    revalidatePath("/projects")
    return project
  },
})

export const updateProject = formAction({
  schema: projectSchema.safeExtend({ projectId: z.uuid() }),
  handler: async ({ projectId, ...input }, { user }) => {
    await requireProjectCapability(user, projectId, "manage")
    await Promise.all([assertCodeAvailable(input.code, projectId), assertClientExists(input.clientId)])
    await db.update(projects).set(projectValues(input)).where(eq(projects.id, projectId))
    await recordAudit({ actorId: user.id, action: "project.updated", entityType: "project", entityId: projectId })
    revalidatePath("/projects")
    revalidatePath(`/projects/${projectId}`, "layout")
    return { id: projectId }
  },
})

export const assignProjectMember = formAction({
  schema: memberAssignmentSchema,
  handler: async ({ projectId, userId, role }, { user }) => {
    await requireProjectCapability(user, projectId, "manage")
    await assertInternalActiveUser(userId)
    await db
      .insert(projectMembers)
      .values({ projectId, userId, role })
      .onConflictDoUpdate({ target: [projectMembers.projectId, projectMembers.userId], set: { role, updatedAt: new Date() } })
    syncLater(projectId)
    await recordAudit({ actorId: user.id, action: "project.member_assigned", entityType: "project", entityId: projectId, metadata: { userId, role } })
    revalidatePath(`/projects/${projectId}`, "layout")
    return undefined
  },
})

export const removeProjectMember = action({
  schema: memberRemovalSchema,
  handler: async ({ projectId, userId }, { user }) => {
    await requireProjectCapability(user, projectId, "manage")
    if (userId === user.id && !can(user, "projects:manage_all")) throw new AppError("You cannot remove yourself from the project.", "FORBIDDEN")
    await db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    syncLater(projectId, { userIds: [userId] })
    await recordAudit({ actorId: user.id, action: "project.member_removed", entityType: "project", entityId: projectId, metadata: { userId } })
    revalidatePath(`/projects/${projectId}`, "layout")
    return undefined
  },
})

function requireGithubManager(user: Parameters<typeof can>[0]) {
  if (!can(user, "github:manage") && user.role !== "project_manager") throw forbiddenError()
}

export const linkRepository = formAction({
  schema: repositoryLinkSchema,
  module: "github",
  handler: async ({ projectId, repositoryId, label }, { user }) => {
    await requireProjectCapability(user, projectId, "manage")
    requireGithubManager(user)
    await db
      .insert(projectRepositories)
      .values({ projectId, repositoryId, label })
      .onConflictDoUpdate({ target: [projectRepositories.projectId, projectRepositories.repositoryId], set: { label } })
    syncLater(projectId)
    await recordAudit({ actorId: user.id, action: "project.repository_linked", entityType: "project", entityId: projectId, metadata: { repositoryId } })
    revalidatePath(`/projects/${projectId}/repositories`)
    return undefined
  },
})

export const createProjectRepository = formAction({
  schema: repositoryCreateSchema,
  module: "github",
  handler: async ({ projectId, label, ...input }, { user }) => {
    await requireProjectCapability(user, projectId, "manage")
    if (!can(user, "github:manage")) throw forbiddenError()
    const repository = await createOrganizationRepository(input)
    if (!repository) throw new AppError("GitHub did not return the new repository.", "UNAVAILABLE")
    await db.insert(projectRepositories).values({ projectId, repositoryId: repository.id, label }).onConflictDoNothing()
    syncLater(projectId)
    await recordAudit({ actorId: user.id, action: "project.repository_created", entityType: "project", entityId: projectId, metadata: { name: input.name } })
    revalidatePath(`/projects/${projectId}/repositories`)
    return undefined
  },
})

export const unlinkRepository = action({
  schema: repositoryUnlinkSchema,
  module: "github",
  handler: async ({ projectId, repositoryId }, { user }) => {
    await requireProjectCapability(user, projectId, "manage")
    requireGithubManager(user)
    await db.delete(projectRepositories).where(and(eq(projectRepositories.projectId, projectId), eq(projectRepositories.repositoryId, repositoryId)))
    syncLater(projectId, { repositoryIds: [repositoryId] })
    await recordAudit({ actorId: user.id, action: "project.repository_unlinked", entityType: "project", entityId: projectId, metadata: { repositoryId } })
    revalidatePath(`/projects/${projectId}/repositories`)
    return undefined
  },
})
