import "server-only"
import { type AnyColumn, asc, desc, ilike, inArray, or, type SQL, sql } from "drizzle-orm"
import type { ListParams } from "@/lib/list-params"

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`)
}

export function searchAcross(term: string, columns: AnyColumn[]): SQL | undefined {
  if (!term) return undefined
  const pattern = `%${escapeLike(term)}%`
  return or(...columns.map((column) => ilike(column, pattern)))
}

export function filterIn<TValue extends string>(
  column: AnyColumn,
  values: readonly string[] | undefined,
  allowed: readonly TValue[],
): SQL | undefined {
  const valid = values?.filter((value): value is TValue => (allowed as readonly string[]).includes(value))
  return valid && valid.length > 0 ? inArray(column, valid) : undefined
}

export function orderFrom<TSort extends string>(
  sort: ListParams<string, TSort>["sort"],
  columns: Record<TSort, AnyColumn | SQL>,
  tieBreaker: AnyColumn,
): SQL[] {
  const ordering: SQL[] = []
  if (sort) ordering.push(sort.desc ? desc(columns[sort.id]) : asc(columns[sort.id]))
  ordering.push(asc(tieBreaker))
  return ordering
}

export function pageWindow(params: Pick<ListParams, "page" | "perPage">) {
  return { limit: params.perPage, offset: (params.page - 1) * params.perPage }
}

export const totalCount = sql<number>`cast(count(*) over() as integer)`

export function facetCounts(rows: Array<{ value: string | null; count: number }>): Map<string, number> {
  return new Map(rows.filter((row) => row.value !== null).map((row) => [row.value as string, row.count]))
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

export function filterIdsIn(column: AnyColumn, values: readonly string[] | undefined): SQL | undefined {
  if (!values || values.length === 0) return undefined
  const valid = values.filter(isUuid)
  return valid.length > 0 ? inArray(column, valid) : sql`false`
}
