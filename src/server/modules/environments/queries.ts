import "server-only"
import { type AnyColumn, and, asc, eq, gte, lte, or, sql } from "drizzle-orm"
import { shiftDate, todayIso } from "@/lib/dates"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { projectEnvironments, projects } from "@/server/db/schema"
import { projectVisibilityCondition } from "@/server/modules/projects/access"

const KIND_ORDER = sql`case ${projectEnvironments.kind} when 'production' then 0 when 'staging' then 1 when 'development' then 2 else 3 end`

export async function listProjectEnvironments(projectId: string) {
  return db
    .select()
    .from(projectEnvironments)
    .where(eq(projectEnvironments.projectId, projectId))
    .orderBy(KIND_ORDER, asc(projectEnvironments.name))
}

export type EnvironmentRow = Awaited<ReturnType<typeof listProjectEnvironments>>[number]

export async function upcomingEnvironmentRenewals(user: CurrentUser, days = 30) {
  const from = shiftDate(todayIso(), -30)
  const to = shiftDate(todayIso(), days)
  const inWindow = (column: AnyColumn) => and(gte(column, from), lte(column, to))
  return db
    .select({
      id: projectEnvironments.id,
      name: projectEnvironments.name,
      url: projectEnvironments.url,
      domainExpiresOn: projectEnvironments.domainExpiresOn,
      hostingExpiresOn: projectEnvironments.hostingExpiresOn,
      projectId: projects.id,
      projectCode: projects.code,
    })
    .from(projectEnvironments)
    .innerJoin(projects, eq(projects.id, projectEnvironments.projectId))
    .where(and(projectVisibilityCondition(user), or(inWindow(projectEnvironments.domainExpiresOn), inWindow(projectEnvironments.hostingExpiresOn))))
    .orderBy(asc(sql`least(${projectEnvironments.domainExpiresOn}, ${projectEnvironments.hostingExpiresOn})`))
    .limit(10)
}
