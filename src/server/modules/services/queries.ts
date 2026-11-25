import "server-only"
import { and, asc, eq, gte, isNotNull, lte, ne } from "drizzle-orm"
import { shiftDate } from "@/lib/dates"
import { todayIso } from "@/lib/dates"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { managedServices, projects, serviceCategories } from "@/server/db/schema"
import { projectVisibilityCondition } from "@/server/modules/projects/access"

export async function listProjectServices(projectId: string) {
  const rows = await db
    .select({ service: managedServices, categoryName: serviceCategories.name })
    .from(managedServices)
    .leftJoin(serviceCategories, eq(serviceCategories.id, managedServices.categoryId))
    .where(eq(managedServices.projectId, projectId))
    .orderBy(asc(managedServices.status), asc(managedServices.name))
  return rows.map((row) => ({ ...row.service, categoryName: row.categoryName }))
}

export type ServiceRow = Awaited<ReturnType<typeof listProjectServices>>[number]

export async function upcomingRenewals(user: CurrentUser, days = 30) {
  const today = todayIso()
  return db
    .select({
      id: managedServices.id,
      name: managedServices.name,
      categoryName: serviceCategories.name,
      expiresOn: managedServices.expiresOn,
      projectId: projects.id,
      projectCode: projects.code,
    })
    .from(managedServices)
    .innerJoin(projects, eq(projects.id, managedServices.projectId))
    .leftJoin(serviceCategories, eq(serviceCategories.id, managedServices.categoryId))
    .where(
      and(
        projectVisibilityCondition(user),
        ne(managedServices.status, "cancelled"),
        isNotNull(managedServices.expiresOn),
        lte(managedServices.expiresOn, shiftDate(today, days)),
        gte(managedServices.expiresOn, shiftDate(today, -30)),
      ),
    )
    .orderBy(asc(managedServices.expiresOn))
    .limit(10)
}
