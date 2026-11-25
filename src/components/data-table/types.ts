import type { ReactNode } from "react"

export interface TableColumn<TRow> {
  id: string
  header: string
  cell: (row: TRow) => ReactNode
  sortable?: boolean
  className?: string
  hideBelow?: "sm" | "md" | "lg"
}
