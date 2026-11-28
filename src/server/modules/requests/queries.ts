import "server-only"
import { and, count, eq, isNotNull } from "drizzle-orm"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import { db } from "@/server/db"
import { boardColumns, tasks, users } from "@/server/db/schema"
import { facetCounts, filterIdsIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"

export const REQUEST_LIST_CONFIG = {
  filters: ["status"] as const,
  sorts: ["number", "createdAt", "updatedAt"] as const,
  defaultSort: { id: "createdAt" as const, desc: true },
}

export type RequestListParams = ListParams<(typeof REQUEST_LIST_CONFIG.filters)[number], (typeof REQUEST_LIST_CONFIG.sorts)[number]>

function requestConditions(projectId: string, params: RequestListParams, withStatus = true) {
  return and(
    eq(tasks.projectId, projectId),
    isNotNull(tasks.requestedById),
    searchAcross(params.q, [tasks.title, tasks.description]),
    withStatus ? filterIdsIn(tasks.columnId, params.filters.status) : undefined,
  )
}

export async function listRequests(projectId: string, params: RequestListParams) {
  const window = pageWindow(params)
  const rows = await db
    .select({
      id: tasks.id,
      number: tasks.number,
      title: tasks.title,
      type: tasks.type,
      priority: tasks.priority,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      status: boardColumns.name,
      requestedBy: users.name,
      total: totalCount,
    })
    .from(tasks)
    .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
    .leftJoin(users, eq(users.id, tasks.requestedById))
    .where(requestConditions(projectId, params))
    .orderBy(...orderFrom(params.sort, { number: tasks.number, createdAt: tasks.createdAt, updatedAt: tasks.updatedAt }, tasks.id))
    .limit(window.limit)
    .offset(window.offset)
  return toPageResult(
    rows.map(({ total: _total, ...row }) => row),
    rows[0]?.total ?? 0,
    params,
  )
}

export type RequestRow = Awaited<ReturnType<typeof listRequests>> extends PageResult<infer TRow> ? TRow : never

export async function requestFacets(projectId: string, params: RequestListParams): Promise<Facet[]> {
  const [rows, columns] = await Promise.all([
    db.select({ value: tasks.columnId, count: count() }).from(tasks).where(requestConditions(projectId, params, false)).groupBy(tasks.columnId),
    db.select({ id: boardColumns.id, name: boardColumns.name }).from(boardColumns).where(eq(boardColumns.projectId, projectId)).orderBy(boardColumns.position),
  ])
  const counts = facetCounts(rows)
  return [{ key: "status", title: "Status", options: columns.map((column) => ({ value: column.id, label: column.name, count: counts.get(column.id) ?? 0 })) }]
}
