import "server-only"
import { and, asc, count, eq, gte, isNotNull, lte, ne } from "drizzle-orm"
import type { PgSelect } from "drizzle-orm/pg-core"
import { BILLING_CYCLE_LABELS, BILLING_CYCLES, SERVICE_STATUS_LABELS, SERVICE_STATUSES } from "@/config/finance"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import { shiftDate } from "@/lib/dates"
import { todayIso } from "@/lib/dates"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { clients, managedServices, projects, serviceCategories } from "@/server/db/schema"
import { facetCounts, filterIdsIn, filterIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"
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

export const SERVICE_LIST_CONFIG = {
  filters: ["status", "cycle", "type", "project"] as const,
  sorts: ["name", "nextBillingOn", "expiresOn", "amount"] as const,
  defaultSort: { id: "nextBillingOn" as const, desc: false },
}

export type ServiceListParams = ListParams<(typeof SERVICE_LIST_CONFIG.filters)[number], (typeof SERVICE_LIST_CONFIG.sorts)[number]>

function serviceConditions(params: ServiceListParams, exclude?: keyof ServiceListParams["filters"]) {
  const { filters } = params
  return and(
    searchAcross(params.q, [managedServices.name, projects.name, clients.name, managedServices.provider]),
    exclude === "status" ? undefined : filterIn(managedServices.status, filters.status, SERVICE_STATUSES),
    exclude === "cycle" ? undefined : filterIn(managedServices.billingCycle, filters.cycle, BILLING_CYCLES),
    exclude === "type" ? undefined : filterIdsIn(managedServices.categoryId, filters.type),
    filterIdsIn(managedServices.projectId, filters.project),
  )
}

function withServiceJoins<TQuery extends PgSelect>(query: TQuery) {
  return query
    .innerJoin(projects, eq(projects.id, managedServices.projectId))
    .leftJoin(clients, eq(clients.id, projects.clientId))
    .leftJoin(serviceCategories, eq(serviceCategories.id, managedServices.categoryId))
}

export async function listServices(params: ServiceListParams) {
  const window = pageWindow(params)
  const rows = await withServiceJoins(
    db
      .select({
        service: managedServices,
        categoryName: serviceCategories.name,
        projectName: projects.name,
        projectCode: projects.code,
        clientName: clients.name,
        total: totalCount,
      })
      .from(managedServices)
      .$dynamic(),
  )
    .where(serviceConditions(params))
    .orderBy(
      ...orderFrom(
        params.sort,
        { name: managedServices.name, nextBillingOn: managedServices.nextBillingOn, expiresOn: managedServices.expiresOn, amount: managedServices.amount },
        managedServices.id,
      ),
    )
    .limit(window.limit)
    .offset(window.offset)

  return toPageResult(
    rows.map((row) => ({ ...row.service, categoryName: row.categoryName, projectName: row.projectName, projectCode: row.projectCode, clientName: row.clientName })),
    rows[0]?.total ?? 0,
    params,
  )
}

export type ServiceListRow = Awaited<ReturnType<typeof listServices>> extends PageResult<infer TRow> ? TRow : never

export async function serviceFacets(params: ServiceListParams): Promise<Facet[]> {
  const [statusRows, cycleRows, typeRows, categories] = await Promise.all([
    withServiceJoins(db.select({ value: managedServices.status, count: count() }).from(managedServices).$dynamic())
      .where(serviceConditions(params, "status"))
      .groupBy(managedServices.status),
    withServiceJoins(db.select({ value: managedServices.billingCycle, count: count() }).from(managedServices).$dynamic())
      .where(serviceConditions(params, "cycle"))
      .groupBy(managedServices.billingCycle),
    withServiceJoins(db.select({ value: managedServices.categoryId, count: count() }).from(managedServices).$dynamic())
      .where(serviceConditions(params, "type"))
      .groupBy(managedServices.categoryId),
    db.select({ id: serviceCategories.id, name: serviceCategories.name }).from(serviceCategories).orderBy(asc(serviceCategories.name)),
  ])
  const statuses = facetCounts(statusRows)
  const cycles = facetCounts(cycleRows)
  const types = facetCounts(typeRows)
  const facets: Facet[] = [
    { key: "status", title: "Status", options: SERVICE_STATUSES.map((value) => ({ value, label: SERVICE_STATUS_LABELS[value], count: statuses.get(value) ?? 0 })) },
    { key: "cycle", title: "Billing", options: BILLING_CYCLES.map((value) => ({ value, label: BILLING_CYCLE_LABELS[value], count: cycles.get(value) ?? 0 })) },
  ]
  if (categories.length > 0) {
    facets.push({ key: "type", title: "Type", options: categories.map((category) => ({ value: category.id, label: category.name, count: types.get(category.id) ?? 0 })) })
  }
  return facets
}

export async function getProjectOption(projectId: string | undefined) {
  if (!projectId) return null
  const [row] = await db.select({ value: projects.id, label: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1)
  return row ?? null
}
