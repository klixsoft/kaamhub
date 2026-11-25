"use client"

import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SortState } from "@/lib/list-params"

interface SortableHeaderProps {
  columnId: string
  label: string
  sort: SortState | null
  onSort: (sort: SortState | null) => void
}

export function SortableHeader({ columnId, label, sort, onSort }: SortableHeaderProps) {
  const active = sort?.id === columnId ? sort : null
  const Icon = active ? (active.desc ? ArrowDownIcon : ArrowUpIcon) : ArrowUpDownIcon
  const ariaSort = active ? (active.desc ? "descending" : "ascending") : "none"

  function cycle() {
    if (!active) onSort({ id: columnId, desc: false })
    else if (!active.desc) onSort({ id: columnId, desc: true })
    else onSort(null)
  }

  return (
    <Button variant="ghost" size="sm" className="-ml-2 h-7" onClick={cycle} aria-label={`Sort by ${label}, currently ${ariaSort}`}>
      {label}
      <Icon className={active ? "" : "text-muted-foreground"} aria-hidden />
    </Button>
  )
}
