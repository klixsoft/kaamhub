import "server-only"
import { and, asc, count, eq, gte, isNotNull, lte, ne, notInArray } from "drizzle-orm"
import { type CurrentUser, can } from "@/server/auth/session"
import { db } from "@/server/db"
import { boardColumns, projects, taskAssignees, tasks, users } from "@/server/db/schema"
import { shiftDate, todayIso } from "@/lib/dates"
import { upcomingEnvironmentRenewals } from "@/server/modules/environments/queries"
import { projectVisibilityCondition } from "@/server/modules/projects/access"
import { upcomingRenewals } from "@/server/modules/services/queries"
import { isModuleEnabled } from "@/server/modules/settings/queries"

const DAY_MS = 24 * 60 * 60 * 1000
const isoDate = (date: Date) => date.toISOString().slice(0, 10)

export async function getMyOpenTasks(user: CurrentUser) {
  return db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectId: projects.id,
      projectCode: projects.code,
      columnName: boardColumns.name,
    })
    .from(taskAssignees)
    .innerJoin(tasks, eq(tasks.id, taskAssignees.taskId))
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(and(eq(taskAssignees.userId, user.id), eq(boardColumns.isDone, false)))
    .orderBy(asc(tasks.dueDate), asc(tasks.createdAt))
    .limit(10)
}

export async function getProjectStatusCounts(user: CurrentUser) {
  return db
    .select({ status: projects.status, count: count() })
    .from(projects)
    .where(projectVisibilityCondition(user))
    .groupBy(projects.status)
}

export async function getUpcomingDeadlines(user: CurrentUser) {
  const today = new Date()
  return db
    .select({ id: projects.id, code: projects.code, name: projects.name, dueDate: projects.dueDate, status: projects.status })
    .from(projects)
    .where(
      and(
        projectVisibilityCondition(user),
        isNotNull(projects.dueDate),
        lte(projects.dueDate, isoDate(new Date(today.getTime() + 30 * DAY_MS))),
        notInArray(projects.status, ["completed", "cancelled"]),
      ),
    )
    .orderBy(asc(projects.dueDate))
    .limit(8)
}

export async function getExpiringAccess(user: CurrentUser) {
  if (!can(user, "people:read")) return []
  const now = new Date()
  return db
    .select({ id: users.id, name: users.name, accessExpiresAt: users.accessExpiresAt })
    .from(users)
    .where(
      and(
        ne(users.role, "client"),
        eq(users.status, "active"),
        gte(users.accessExpiresAt, now),
        lte(users.accessExpiresAt, new Date(now.getTime() + 14 * DAY_MS)),
      ),
    )
    .orderBy(asc(users.accessExpiresAt))
    .limit(8)
}

export interface RenewalItem {
  key: string
  href: string
  projectCode: string
  title: string
  detail: string | null
  date: string
}

export async function getRenewals(user: CurrentUser): Promise<RenewalItem[]> {
  const [services, environments] = await Promise.all([
    isModuleEnabled("services").then((enabled) => (enabled && can(user, "finance:read") ? upcomingRenewals(user) : [])),
    isModuleEnabled("environments").then((enabled) => (enabled ? upcomingEnvironmentRenewals(user) : [])),
  ])
  const items: RenewalItem[] = [
    ...services.flatMap((service) =>
      service.expiresOn
        ? [{ key: `service-${service.id}`, href: `/services?project=${service.projectId}`, projectCode: service.projectCode, title: service.name, detail: service.categoryName, date: service.expiresOn }]
        : [],
    ),
    ...environments.flatMap((environment) => {
      const href = `/projects/${environment.projectId}/environments`
      return [
        environment.domainExpiresOn
          ? { key: `domain-${environment.id}`, href, projectCode: environment.projectCode, title: `${environment.name} domain`, detail: environment.url, date: environment.domainExpiresOn }
          : null,
        environment.hostingExpiresOn
          ? { key: `hosting-${environment.id}`, href, projectCode: environment.projectCode, title: `${environment.name} hosting`, detail: environment.url, date: environment.hostingExpiresOn }
          : null,
      ].filter((item): item is RenewalItem => item !== null)
    }),
  ]
  const horizon = shiftDate(todayIso(), 30)
  return items.filter((item) => item.date <= horizon).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 10)
}
