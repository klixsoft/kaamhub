import "server-only"
import { and, asc, eq, ne } from "drizzle-orm"
import { SYSTEM_ROLE_LABELS } from "@/config/roles"
import type { Option, OptionParams, OptionResource } from "@/lib/options"
import { type CurrentUser, can } from "@/server/auth/session"
import { db } from "@/server/db"
import { clients, departments, designations, githubRepositories, projectMembers, projects, users } from "@/server/db/schema"
import { isUuid, searchAcross } from "@/server/lib/query"
import { resolveProjectAccess } from "@/server/modules/projects/access"
import { isModuleEnabled } from "@/server/modules/settings/queries"

const LIMIT = 20

type Resolver = (query: string, params: OptionParams, user: CurrentUser) => Promise<Option[] | null>

const internalStaff = (user: CurrentUser) => user.role !== "client" && user.role !== "freelancer"

const resolvers: Record<OptionResource, Resolver> = {
  people: async (query, _params, user) => {
    if (!internalStaff(user)) return null
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(and(ne(users.role, "client"), eq(users.status, "active"), searchAcross(query, [users.name, users.email])))
      .orderBy(asc(users.name))
      .limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.name, description: `${SYSTEM_ROLE_LABELS[row.role]} · ${row.email}` }))
  },
  clients: async (query, _params, user) => {
    if (!can(user, "clients:read") && !can(user, "projects:create")) return null
    const rows = await db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(and(ne(clients.status, "past"), searchAcross(query, [clients.name])))
      .orderBy(asc(clients.name))
      .limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.name }))
  },
  departments: async (query, _params, user) => {
    if (!can(user, "people:read")) return null
    const rows = await db.select().from(departments).where(searchAcross(query, [departments.name])).orderBy(asc(departments.name)).limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.name }))
  },
  designations: async (query, _params, user) => {
    if (!can(user, "people:read")) return null
    const rows = await db.select().from(designations).where(searchAcross(query, [designations.name])).orderBy(asc(designations.name)).limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.name }))
  },
  repositories: async (query, _params, user) => {
    if ((!can(user, "github:manage") && user.role !== "project_manager") || !(await isModuleEnabled("github"))) return null
    const rows = await db
      .select({ id: githubRepositories.id, fullName: githubRepositories.fullName, description: githubRepositories.description })
      .from(githubRepositories)
      .where(and(eq(githubRepositories.isArchived, false), searchAcross(query, [githubRepositories.fullName])))
      .orderBy(asc(githubRepositories.fullName))
      .limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.fullName, description: row.description ?? undefined }))
  },
  "client-projects": async (query, params, user) => {
    if (!can(user, "finance:read") || !params.clientId || !isUuid(params.clientId)) return null
    const rows = await db
      .select({ id: projects.id, code: projects.code, name: projects.name })
      .from(projects)
      .where(and(eq(projects.clientId, params.clientId), searchAcross(query, [projects.name, projects.code])))
      .orderBy(asc(projects.name))
      .limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.name, description: row.code }))
  },
  "project-members": async (query, params, user) => {
    if (!params.projectId || !isUuid(params.projectId)) return null
    const access = await resolveProjectAccess(user, params.projectId)
    if (!access?.canEditTasks) return null
    const rows = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(and(eq(projectMembers.projectId, params.projectId), searchAcross(query, [users.name, users.email])))
      .orderBy(asc(users.name))
      .limit(LIMIT)
    return rows.map((row) => ({ value: row.id, label: row.name, description: row.email }))
  },
}

export function resolveOptions(resource: OptionResource, query: string, params: OptionParams, user: CurrentUser) {
  return resolvers[resource](query, params, user)
}
