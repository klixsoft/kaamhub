import "server-only"
import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm"
import { shiftDate } from "@/lib/dates"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import { db } from "@/server/db"
import { projects, tasks, timeEntries, users } from "@/server/db/schema"
import { facetCounts, filterIdsIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"

const minutesSum = sql<number>`cast(coalesce(sum(${timeEntries.minutes}), 0) as integer)`

export async function taskTime(taskId: string, viewerId: string, canManage: boolean) {
  const rows = await db
    .select({
      id: timeEntries.id,
      workDate: timeEntries.workDate,
      minutes: timeEntries.minutes,
      note: timeEntries.note,
      billable: timeEntries.billable,
      userId: timeEntries.userId,
      userName: users.name,
    })
    .from(timeEntries)
    .innerJoin(users, eq(users.id, timeEntries.userId))
    .where(eq(timeEntries.taskId, taskId))
    .orderBy(desc(timeEntries.workDate), desc(timeEntries.createdAt))
  return {
    totalMinutes: rows.reduce((total, row) => total + row.minutes, 0),
    entries: rows.map(({ userId, ...row }) => ({ ...row, canEdit: canManage || userId === viewerId })),
  }
}

export type TaskTime = Awaited<ReturnType<typeof taskTime>>

export async function weekEntries(userId: string, weekStart: string) {
  return db
    .select({
      id: timeEntries.id,
      workDate: timeEntries.workDate,
      minutes: timeEntries.minutes,
      note: timeEntries.note,
      billable: timeEntries.billable,
      projectId: timeEntries.projectId,
      projectCode: projects.code,
      projectName: projects.name,
      taskNumber: tasks.number,
      taskTitle: tasks.title,
    })
    .from(timeEntries)
    .innerJoin(projects, eq(projects.id, timeEntries.projectId))
    .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
    .where(and(eq(timeEntries.userId, userId), gte(timeEntries.workDate, weekStart), lte(timeEntries.workDate, shiftDate(weekStart, 6))))
    .orderBy(asc(timeEntries.workDate), asc(timeEntries.createdAt))
}

export type WeekEntry = Awaited<ReturnType<typeof weekEntries>>[number]

export const TIME_LIST_CONFIG = {
  filters: ["person", "billable"] as const,
  sorts: ["workDate", "minutes"] as const,
  defaultSort: { id: "workDate" as const, desc: true },
}

export type TimeListParams = ListParams<(typeof TIME_LIST_CONFIG.filters)[number], (typeof TIME_LIST_CONFIG.sorts)[number]>

function billableCondition(values: readonly string[] | undefined) {
  const selected = (values ?? []).filter((value) => value === "yes" || value === "no")
  return selected.length === 1 ? eq(timeEntries.billable, selected[0] === "yes") : undefined
}

function projectTimeConditions(projectId: string, params: TimeListParams, exclude?: keyof TimeListParams["filters"]) {
  return and(
    eq(timeEntries.projectId, projectId),
    searchAcross(params.q, [timeEntries.note, tasks.title, users.name]),
    exclude === "person" ? undefined : filterIdsIn(timeEntries.userId, params.filters.person),
    exclude === "billable" ? undefined : billableCondition(params.filters.billable),
  )
}

export async function projectTime(projectId: string, params: TimeListParams) {
  const window = pageWindow(params)
  const where = projectTimeConditions(projectId, params)
  const [rows, [totals]] = await Promise.all([
    db
      .select({
        id: timeEntries.id,
        workDate: timeEntries.workDate,
        minutes: timeEntries.minutes,
        note: timeEntries.note,
        billable: timeEntries.billable,
        userName: users.name,
        taskNumber: tasks.number,
        taskTitle: tasks.title,
        total: totalCount,
      })
      .from(timeEntries)
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(where)
      .orderBy(...orderFrom(params.sort, { workDate: timeEntries.workDate, minutes: timeEntries.minutes }, timeEntries.id))
      .limit(window.limit)
      .offset(window.offset),
    db
      .select({ all: minutesSum, billable: sql<number>`cast(coalesce(sum(${timeEntries.minutes}) filter (where ${timeEntries.billable}), 0) as integer)` })
      .from(timeEntries)
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(where),
  ])
  return {
    result: toPageResult(
      rows.map(({ total: _total, ...row }) => row),
      rows[0]?.total ?? 0,
      params,
    ),
    totalMinutes: totals?.all ?? 0,
    billableMinutes: totals?.billable ?? 0,
  }
}

export type ProjectTimeRow = Awaited<ReturnType<typeof projectTime>>["result"] extends PageResult<infer TRow> ? TRow : never

export async function projectTimeFacets(projectId: string, params: TimeListParams): Promise<Facet[]> {
  const [people, billable] = await Promise.all([
    db
      .select({ value: timeEntries.userId, label: users.name, count: count() })
      .from(timeEntries)
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(projectTimeConditions(projectId, params, "person"))
      .groupBy(timeEntries.userId, users.name)
      .orderBy(asc(users.name)),
    db
      .select({ value: sql<string>`case when ${timeEntries.billable} then 'yes' else 'no' end`, count: count() })
      .from(timeEntries)
      .innerJoin(users, eq(users.id, timeEntries.userId))
      .leftJoin(tasks, eq(tasks.id, timeEntries.taskId))
      .where(projectTimeConditions(projectId, params, "billable"))
      .groupBy(timeEntries.billable),
  ])
  const billableCounts = facetCounts(billable)
  return [
    { key: "person", title: "Person", options: people.map((row) => ({ value: row.value, label: row.label, count: row.count })) },
    { key: "billable", title: "Billable", options: [{ value: "yes", label: "Billable", count: billableCounts.get("yes") ?? 0 }, { value: "no", label: "Not billable", count: billableCounts.get("no") ?? 0 }] },
  ]
}

export async function timesheetPeople() {
  return db.select({ id: users.id, name: users.name }).from(users).where(sql`${users.role} <> 'client'`).orderBy(asc(users.name))
}

