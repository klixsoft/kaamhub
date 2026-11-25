"use client"

import { SearchXIcon } from "lucide-react"
import type { ReactNode } from "react"
import { EmptyState } from "@/components/layout/empty-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useListState } from "@/hooks/use-list-state"
import { type Facet, LIST_PARAM_KEYS, type PageResult, type SortState } from "@/lib/list-params"
import { cn } from "@/lib/utils"
import { SortableHeader } from "./sortable-header"
import { TablePagination } from "./table-pagination"
import { TableToolbar } from "./table-toolbar"
import type { TableColumn } from "./types"

interface TableRenderProps<TRow> {
  columns: TableColumn<TRow>[]
  result: PageResult<TRow>
  getRowId: (row: TRow) => string
  facets?: Facet[]
  searchPlaceholder?: string
  toolbarActions?: ReactNode
  emptyState?: ReactNode
  caption?: string
}

const HIDE_BELOW_CLASS = { sm: "hidden sm:table-cell", md: "hidden md:table-cell", lg: "hidden lg:table-cell" } as const

function parseSort(value: string | null): SortState | null {
  if (!value) return null
  const [id, direction] = value.split(".")
  return id ? { id, desc: direction === "desc" } : null
}

export function TableRender<TRow>({
  columns,
  result,
  getRowId,
  facets = [],
  searchPlaceholder,
  toolbarActions,
  emptyState,
  caption,
}: TableRenderProps<TRow>) {
  const { searchParams, setParams, getValues, isPending } = useListState()
  const sort = parseSort(searchParams.get(LIST_PARAM_KEYS.sort))
  const isFiltered = Boolean(searchParams.get(LIST_PARAM_KEYS.q)) || facets.some((facet) => getValues(facet.key).length > 0)

  const onSort = (next: SortState | null) =>
    setParams({ [LIST_PARAM_KEYS.sort]: next ? `${next.id}.${next.desc ? "desc" : "asc"}` : null }, { resetPage: false })

  return (
    <div className="flex flex-col gap-4">
      <TableToolbar
        searchPlaceholder={searchPlaceholder}
        facets={facets}
        actions={toolbarActions}
        searchValue={searchParams.get(LIST_PARAM_KEYS.q) ?? ""}
        getValues={getValues}
        setParams={setParams}
      />
      <div
        className={cn("overflow-hidden rounded-lg border transition-opacity", isPending && "opacity-60")}
        aria-busy={isPending}
      >
        <Table>
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <TableHeader className="bg-muted/40">
            <TableRow>
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(column.hideBelow && HIDE_BELOW_CLASS[column.hideBelow], column.className)}
                  aria-sort={sort?.id === column.id ? (sort.desc ? "descending" : "ascending") : undefined}
                >
                  {column.sortable ? (
                    <SortableHeader columnId={column.id} label={column.header} sort={sort} onSort={onSort} />
                  ) : (
                    column.header
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.rows.length > 0 ? (
              result.rows.map((row) => (
                <TableRow key={getRowId(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.id} className={cn(column.hideBelow && HIDE_BELOW_CLASS[column.hideBelow], column.className)}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length}>
                  {isFiltered || !emptyState ? (
                    <EmptyState
                      icon={SearchXIcon}
                      title="No results found"
                      description="Try changing your search or removing some filters."
                    />
                  ) : (
                    emptyState
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {result.total > 0 ? <TablePagination pagination={result} setParams={setParams} /> : null}
    </div>
  )
}
