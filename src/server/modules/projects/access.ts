import "server-only"
import { and, eq, exists, type SQL } from "drizzle-orm"
import type { ProjectRole } from "@/config/roles"
import { type CurrentUser, can } from "@/server/auth/session"
import { db } from "@/server/db"
import { clientContacts, projectMembers, projects } from "@/server/db/schema"

export function projectVisibilityCondition(user: CurrentUser): SQL | undefined {
  if (can(user, "projects:read_all")) return undefined
  if (user.role === "client") {
    return exists(
      db
        .select({ one: clientContacts.userId })
        .from(clientContacts)
        .where(and(eq(clientContacts.clientId, projects.clientId), eq(clientContacts.userId, user.id))),
    )
  }
  return exists(
    db
      .select({ one: projectMembers.userId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, user.id))),
  )
}

export interface ProjectAccess {
  projectId: string
  memberRole: ProjectRole | null
  isClientViewer: boolean
  canManage: boolean
  canEditTasks: boolean
}

export async function resolveProjectAccess(user: CurrentUser, projectId: string): Promise<ProjectAccess | null> {
  const [row] = await db
    .select({ id: projects.id, memberRole: projectMembers.role, contactUserId: clientContacts.userId })
    .from(projects)
    .leftJoin(projectMembers, and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, user.id)))
    .leftJoin(clientContacts, and(eq(clientContacts.clientId, projects.clientId), eq(clientContacts.userId, user.id)))
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!row) return null

  const readAll = can(user, "projects:read_all")
  const isClientViewer = user.role === "client" && row.contactUserId !== null
  if (!readAll && !row.memberRole && !isClientViewer) return null

  const canManage = can(user, "projects:manage_all") || row.memberRole === "manager"
  return {
    projectId: row.id,
    memberRole: row.memberRole,
    isClientViewer,
    canManage,
    canEditTasks: canManage || (row.memberRole !== null && row.memberRole !== "viewer"),
  }
}
