"use client"

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DEFAULT_PER_PAGE, LIST_PARAM_KEYS, PER_PAGE_OPTIONS, type PageResult } from "@/lib/list-params"

interface TablePaginationProps {
  pagination: Omit<PageResult<unknown>, "rows">
  setParams: (patch: Record<string, string | number | null>, options?: { resetPage?: boolean }) => void
}

export function TablePagination({ pagination, setParams }: TablePaginationProps) {
  const { page, pageCount, perPage, total } = pagination
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  const goTo = (target: number) => setParams({ [LIST_PARAM_KEYS.page]: target === 1 ? null : target }, { resetPage: false })

  return (
    <div className="flex flex-col-reverse gap-3 px-1 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-muted-foreground tabular-nums">
        {total === 0 ? "No results" : `Showing ${from}–${to} of ${total}`}
      </p>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-muted-foreground">Rows per page</span>
          <Select
            value={String(perPage)}
            onValueChange={(value) => setParams({ [LIST_PARAM_KEYS.perPage]: Number(value) === DEFAULT_PER_PAGE ? null : String(value) })}
          >
            <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PER_PAGE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="tabular-nums">
          Page {Math.min(page, pageCount)} of {pageCount}
        </span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon-sm" onClick={() => goTo(1)} disabled={page <= 1} aria-label="First page">
            <ChevronsLeftIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeftIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <ChevronRightIcon />
          </Button>
          <Button variant="outline" size="icon-sm" onClick={() => goTo(pageCount)} disabled={page >= pageCount} aria-label="Last page">
            <ChevronsRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}
