"use client"

import { ClockIcon } from "lucide-react"
import Link from "next/link"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { formatMinutes } from "@/lib/duration"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import type { ProjectTimeRow } from "@/server/modules/time/queries"

interface ProjectTimeTableProps {
  projectId: string
  projectCode: string
  result: PageResult<ProjectTimeRow>
  facets: Facet[]
  totalMinutes: number
  billableMinutes: number
}

export function ProjectTimeTable({ projectId, projectCode, result, facets, totalMinutes, billableMinutes }: ProjectTimeTableProps) {
  const columns: TableColumn<ProjectTimeRow>[] = [
    { id: "workDate", header: "Date", sortable: true, cell: (row) => formatDate(row.workDate) },
    { id: "person", header: "Person", cell: (row) => row.userName },
    {
      id: "card",
      header: "Card",
      hideBelow: "md",
      cell: (row) =>
        row.taskNumber ? (
          <Link href={`/projects/${projectId}/board?task=${row.taskNumber}`} className="hover:underline">
            <span className="font-mono text-xs text-muted-foreground">
              {projectCode}-{row.taskNumber}
            </span>{" "}
            {row.taskTitle}
          </Link>
        ) : (
          <span className="text-muted-foreground">General</span>
        ),
    },
    { id: "note", header: "Note", hideBelow: "lg", cell: (row) => <span className="line-clamp-1 text-muted-foreground">{row.note ?? "—"}</span> },
    {
      id: "minutes",
      header: "Time",
      sortable: true,
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className="flex items-center justify-end gap-2">
          {row.billable ? null : <Badge variant="secondary">Not billable</Badge>}
          {formatMinutes(row.minutes)}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-muted-foreground">Total logged (matching filters)</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatMinutes(totalMinutes)}</dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-muted-foreground">Billable</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatMinutes(billableMinutes)}</dd>
        </div>
      </dl>
      <TableRender
        columns={columns}
        result={result}
        facets={facets}
        getRowId={(row) => row.id}
        searchPlaceholder="Search notes, cards or people…"
        caption="Time logged on this project"
        emptyState={<EmptyState icon={ClockIcon} title="No time logged yet" description="Log time from any card on the board, or from Timesheets." />}
      />
    </div>
  )
}
