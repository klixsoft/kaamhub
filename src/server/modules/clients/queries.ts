import "server-only"
import { and, asc, count, eq, sql } from "drizzle-orm"
import { CLIENT_STATUS_LABELS, CLIENT_STATUSES } from "@/config/domain"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import { db } from "@/server/db"
import { clientContacts, clients, projects, users } from "@/server/db/schema"
import { facetCounts, filterIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"

export const CLIENT_LIST_CONFIG = {
  filters: ["status"] as const,
  sorts: ["name", "createdAt"] as const,
  defaultSort: { id: "name" as const, desc: false },
}

export type ClientListParams = ListParams<(typeof CLIENT_LIST_CONFIG.filters)[number], (typeof CLIENT_LIST_CONFIG.sorts)[number]>

function clientConditions(params: ClientListParams, exclude?: "status") {
  return and(
    searchAcross(params.q, [clients.name, clients.email, clients.taxNumber]),
    exclude === "status" ? undefined : filterIn(clients.status, params.filters.status, CLIENT_STATUSES),
  )
}

const projectCount = sql<number>`(select cast(count(*) as integer) from ${projects} where ${projects.clientId} = ${clients.id})`

export async function listClients(params: ClientListParams) {
  const window = pageWindow(params)
  const rows = await db
    .select({
      id: clients.id,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      status: clients.status,
      createdAt: clients.createdAt,
      projectCount,
      total: totalCount,
    })
    .from(clients)
    .where(clientConditions(params))
    .orderBy(...orderFrom(params.sort, { name: clients.name, createdAt: clients.createdAt }, clients.id))
    .limit(window.limit)
    .offset(window.offset)

  return toPageResult(
    rows.map(({ total: _total, ...row }) => row),
    rows[0]?.total ?? 0,
    params,
  )
}

export type ClientRow = Awaited<ReturnType<typeof listClients>> extends PageResult<infer TRow> ? TRow : never

export async function clientFacets(params: ClientListParams): Promise<Facet[]> {
  const statusCounts = facetCounts(
    await db.select({ value: clients.status, count: count() }).from(clients).where(clientConditions(params, "status")).groupBy(clients.status),
  )
  return [
    {
      key: "status",
      title: "Status",
      options: CLIENT_STATUSES.map((status) => ({ value: status, label: CLIENT_STATUS_LABELS[status], count: statusCounts.get(status) ?? 0 })),
    },
  ]
}

export async function getClient(clientId: string) {
  const [client, contacts, clientProjects] = await Promise.all([
    db.query.clients.findFirst({ where: (table, { eq: equals }) => equals(table.id, clientId) }),
    db
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        status: users.status,
        jobTitle: clientContacts.jobTitle,
        isPrimary: clientContacts.isPrimary,
      })
      .from(clientContacts)
      .innerJoin(users, eq(users.id, clientContacts.userId))
      .where(eq(clientContacts.clientId, clientId))
      .orderBy(asc(users.name)),
    db
      .select({ id: projects.id, code: projects.code, name: projects.name, status: projects.status, dueDate: projects.dueDate })
      .from(projects)
      .where(eq(projects.clientId, clientId))
      .orderBy(asc(projects.name)),
  ])
  return client ? { ...client, contacts, projects: clientProjects } : null
}

export type ClientDetail = NonNullable<Awaited<ReturnType<typeof getClient>>>
