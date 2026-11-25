import "server-only"
import { and, asc, count, eq, sql } from "drizzle-orm"
import {
  GITHUB_ACCESS_STATUSES,
  PRIORITIES,
  PRIORITY_LABELS,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUSES,
} from "@/config/domain"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import {
  boardColumns,
  clients,
  githubAccessGrants,
  githubRepositories,
  memberProfiles,
  designations,
  projectCategories,
  projectMembers,
  projectRepositories,
  projects,
  tasks,
  users,
} from "@/server/db/schema"
import { facetCounts, filterIdsIn, filterIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"
import { projectVisibilityCondition } from "./access"

export const PROJECT_LIST_CONFIG = {
  filters: ["status", "category", "priority"] as const,
  sorts: ["name", "code", "dueDate", "updatedAt"] as const,
  defaultSort: { id: "updatedAt" as const, desc: true },
}

export type ProjectListParams = ListParams<(typeof PROJECT_LIST_CONFIG.filters)[number], (typeof PROJECT_LIST_CONFIG.sorts)[number]>

function projectConditions(user: CurrentUser, params: ProjectListParams, exclude?: keyof ProjectListParams["filters"]) {
  const { filters } = params
  return and(
    projectVisibilityCondition(user),
    searchAcross(params.q, [projects.name, projects.code, clients.name]),
    exclude === "status" ? undefined : filterIn(projects.status, filters.status, PROJECT_STATUSES),
    exclude === "category" ? undefined : filterIdsIn(projects.categoryId, filters.category),
    exclude === "priority" ? undefined : filterIn(projects.priority, filters.priority, PRIORITIES),
  )
}

function taskProgress(user: CurrentUser) {
  const clientFilter = user.role === "client" ? sql`and ${tasks.visibility} = 'client'` : sql``
  return {
    taskTotal: sql<number>`(select cast(count(*) as integer) from ${tasks} where ${tasks.projectId} = ${projects.id} ${clientFilter})`,
    taskDone: sql<number>`(select cast(count(*) as integer) from ${tasks} inner join ${boardColumns} on ${boardColumns.id} = ${tasks.columnId} where ${tasks.projectId} = ${projects.id} and ${boardColumns.isDone} ${clientFilter})`,
  }
}

export async function listProjects(user: CurrentUser, params: ProjectListParams) {
  const window = pageWindow(params)
  const rows = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      status: projects.status,
      categoryName: projectCategories.name,
      priority: projects.priority,
      dueDate: projects.dueDate,
      updatedAt: projects.updatedAt,
      clientName: clients.name,
      memberCount: sql<number>`(select cast(count(*) as integer) from ${projectMembers} where ${projectMembers.projectId} = ${projects.id})`,
      ...taskProgress(user),
      total: totalCount,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(projectCategories, eq(projectCategories.id, projects.categoryId))
    .where(projectConditions(user, params))
    .orderBy(
      ...orderFrom(
        params.sort,
        { name: projects.name, code: projects.code, dueDate: projects.dueDate, updatedAt: projects.updatedAt },
        projects.id,
      ),
    )
    .limit(window.limit)
    .offset(window.offset)

  return toPageResult(
    rows.map(({ total: _total, ...row }) => row),
    rows[0]?.total ?? 0,
    params,
  )
}

export type ProjectRow = Awaited<ReturnType<typeof listProjects>> extends PageResult<infer TRow> ? TRow : never

export async function projectFacets(user: CurrentUser, params: ProjectListParams): Promise<Facet[]> {
  const grouped = <TColumn extends typeof projects.status | typeof projects.priority | typeof projects.categoryId>(
    column: TColumn,
    exclude: keyof ProjectListParams["filters"],
  ) =>
    db
      .select({ value: column, count: count() })
      .from(projects)
      .leftJoin(clients, eq(clients.id, projects.clientId))
      .where(projectConditions(user, params, exclude))
      .groupBy(column)

  const [statusRows, priorityRows, categoryCountRows, categories] = await Promise.all([
    grouped(projects.status, "status"),
    grouped(projects.priority, "priority"),
    grouped(projects.categoryId, "category"),
    db.select({ id: projectCategories.id, name: projectCategories.name }).from(projectCategories).orderBy(asc(projectCategories.name)),
  ])
  const statusCounts = facetCounts(statusRows)
  const priorityCounts = facetCounts(priorityRows)
  const categoryCounts = facetCounts(categoryCountRows)

  const facets: Facet[] = [
    { key: "status", title: "Status", options: PROJECT_STATUSES.map((value) => ({ value, label: PROJECT_STATUS_LABELS[value], count: statusCounts.get(value) ?? 0 })) },
    { key: "priority", title: "Priority", options: PRIORITIES.map((value) => ({ value, label: PRIORITY_LABELS[value], count: priorityCounts.get(value) ?? 0 })) },
  ]
  if (categories.length > 0) {
    facets.splice(1, 0, {
      key: "category",
      title: "Category",
      options: categories.map((category) => ({ value: category.id, label: category.name, count: categoryCounts.get(category.id) ?? 0 })),
    })
  }
  return facets
}

export async function getProjectSummary(projectId: string) {
  const [row] = await db
    .select({
      id: projects.id,
      code: projects.code,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      categoryId: projects.categoryId,
      categoryName: projectCategories.name,
      priority: projects.priority,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      clientId: projects.clientId,
      clientName: clients.name,
      recurringBilling: projects.recurringBilling,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(projectCategories, eq(projectCategories.id, projects.categoryId))
    .where(eq(projects.id, projectId))
    .limit(1)
  return row ?? null
}

export type ProjectSummary = NonNullable<Awaited<ReturnType<typeof getProjectSummary>>>

export async function listProjectMembers(projectId: string) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      systemRole: users.role,
      status: users.status,
      githubUsername: users.githubUsername,
      role: projectMembers.role,
      designation: designations.name,
      addedAt: projectMembers.createdAt,
    })
    .from(projectMembers)
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(designations, eq(designations.id, memberProfiles.designationId))
    .where(eq(projectMembers.projectId, projectId))
    .orderBy(asc(projectMembers.role), asc(users.name))
}

export type ProjectMemberRow = Awaited<ReturnType<typeof listProjectMembers>>[number]

export async function listProjectRepositories(projectId: string) {
  const [repositories, grants] = await Promise.all([
    db
      .select({
        id: githubRepositories.id,
        fullName: githubRepositories.fullName,
        description: githubRepositories.description,
        isPrivate: githubRepositories.isPrivate,
        isArchived: githubRepositories.isArchived,
        defaultBranch: githubRepositories.defaultBranch,
        htmlUrl: githubRepositories.htmlUrl,
        pushedAt: githubRepositories.pushedAt,
        label: projectRepositories.label,
      })
      .from(projectRepositories)
      .innerJoin(githubRepositories, eq(githubRepositories.id, projectRepositories.repositoryId))
      .where(eq(projectRepositories.projectId, projectId))
      .orderBy(asc(projectRepositories.label), asc(githubRepositories.fullName)),
    db
      .select({
        repositoryId: githubAccessGrants.repositoryId,
        userId: githubAccessGrants.userId,
        name: users.name,
        login: githubAccessGrants.githubLogin,
        permission: githubAccessGrants.permission,
        status: githubAccessGrants.status,
        error: githubAccessGrants.error,
      })
      .from(githubAccessGrants)
      .innerJoin(projectRepositories, eq(projectRepositories.repositoryId, githubAccessGrants.repositoryId))
      .innerJoin(projectMembers, and(eq(projectMembers.projectId, projectRepositories.projectId), eq(projectMembers.userId, githubAccessGrants.userId)))
      .innerJoin(users, eq(users.id, githubAccessGrants.userId))
      .where(eq(projectRepositories.projectId, projectId))
      .orderBy(asc(users.name)),
  ])

  const grantsByRepository = Map.groupBy(grants, (grant) => grant.repositoryId)
  return repositories.map((repository) => ({ ...repository, grants: grantsByRepository.get(repository.id) ?? [] }))
}

export type ProjectRepositoryRow = Awaited<ReturnType<typeof listProjectRepositories>>[number]
export type GithubGrantStatus = (typeof GITHUB_ACCESS_STATUSES)[number]
