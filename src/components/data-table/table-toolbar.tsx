"use client"

import { SearchIcon, XIcon } from "lucide-react"
import { type ReactNode, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { LIST_PARAM_KEYS, type Facet } from "@/lib/list-params"
import { FacetFilter } from "./facet-filter"

interface TableToolbarProps {
  searchPlaceholder?: string
  facets: Facet[]
  actions?: ReactNode
  searchValue: string
  getValues: (key: string) => string[]
  setParams: (patch: Record<string, string | null>) => void
}

export function TableToolbar({ searchPlaceholder = "Search…", facets, actions, searchValue, getValues, setParams }: TableToolbarProps) {
  const [query, setQuery] = useState(searchValue)
  const debouncedQuery = useDebouncedValue(query)
  const lastSubmitted = useRef(searchValue)

  useEffect(() => {
    if (debouncedQuery === lastSubmitted.current) return
    lastSubmitted.current = debouncedQuery
    setParams({ [LIST_PARAM_KEYS.q]: debouncedQuery.trim() || null })
  }, [debouncedQuery, setParams])

  const hasActiveFilters = query.length > 0 || facets.some((facet) => getValues(facet.key).length > 0)

  function resetAll() {
    setQuery("")
    lastSubmitted.current = ""
    setParams({ [LIST_PARAM_KEYS.q]: null, ...Object.fromEntries(facets.map((facet) => [facet.key, null])) })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <InputGroup className="h-8 w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </InputGroup>
        {facets.map((facet) => (
          <FacetFilter
            key={facet.key}
            facet={facet}
            selected={getValues(facet.key)}
            onChange={(values) => setParams({ [facet.key]: values.length > 0 ? values.join(",") : null })}
          />
        ))}
        {hasActiveFilters ? (
          <Button variant="ghost" size="sm" className="h-8" onClick={resetAll}>
            Reset
            <XIcon aria-hidden />
          </Button>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
