import "server-only"
import { and, asc, count, eq, gte, isNotNull, lte, ne, notInArray } from "drizzle-orm"
import { type CurrentUser, can } from "@/server/auth/session"
import { db } from "@/server/db"
import { boardColumns, projects, taskAssignees, tasks, users } from "@/server/db/schema"
import { projectVisibilityCondition } from "@/server/modules/projects/access"

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
