export type SearchParamsRecord = Record<string, string | string[] | undefined>

export interface SortState {
  id: string
  desc: boolean
}

export interface ListParams<TFilter extends string = string, TSort extends string = string> {
  page: number
  perPage: number
  q: string
  sort: (SortState & { id: TSort }) | null
  filters: Partial<Record<TFilter, string[]>>
}

export interface ListConfig<TFilter extends string, TSort extends string> {
  filters: readonly TFilter[]
  sorts: readonly TSort[]
  defaultSort?: SortState & { id: TSort }
}

export interface PageResult<TRow> {
  rows: TRow[]
  total: number
  page: number
  perPage: number
  pageCount: number
}

export interface FacetOption {
  value: string
  label: string
  count?: number
}

export interface Facet {
  key: string
  title: string
  options: FacetOption[]
}

export const PER_PAGE_OPTIONS = [10, 20, 50, 100] as const
export const DEFAULT_PER_PAGE = 20
export const LIST_PARAM_KEYS = { page: "page", perPage: "perPage", q: "q", sort: "sort" } as const

const MAX_SEARCH_LENGTH = 100
const MAX_FILTER_VALUES = 20

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function positiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function parseListParams<TFilter extends string, TSort extends string>(
  searchParams: SearchParamsRecord,
  config: ListConfig<TFilter, TSort>,
): ListParams<TFilter, TSort> {
  const perPageCandidate = positiveInt(first(searchParams.perPage), DEFAULT_PER_PAGE)
  const perPage = (PER_PAGE_OPTIONS as readonly number[]).includes(perPageCandidate) ? perPageCandidate : DEFAULT_PER_PAGE

  const [sortId, sortDirection] = (first(searchParams.sort) ?? "").split(".")
  const sort =
    sortId && (config.sorts as readonly string[]).includes(sortId)
      ? { id: sortId as TSort, desc: sortDirection === "desc" }
      : (config.defaultSort ?? null)

  const filters: Partial<Record<TFilter, string[]>> = {}
  for (const key of config.filters) {
    const raw = first(searchParams[key])
    if (!raw) continue
    const values = [...new Set(raw.split(",").map((value) => value.trim()).filter(Boolean))].slice(0, MAX_FILTER_VALUES)
    if (values.length > 0) filters[key] = values
  }

  return {
    page: positiveInt(first(searchParams.page), 1),
    perPage,
    q: (first(searchParams.q) ?? "").trim().slice(0, MAX_SEARCH_LENGTH),
    sort,
    filters,
  }
}

export function toPageResult<TRow>(rows: TRow[], total: number, params: Pick<ListParams, "page" | "perPage">): PageResult<TRow> {
  return {
    rows,
    total,
    page: params.page,
    perPage: params.perPage,
    pageCount: Math.max(1, Math.ceil(total / params.perPage)),
  }
}
