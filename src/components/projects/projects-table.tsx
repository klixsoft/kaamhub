"use client"

import Link from "next/link"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { EmptyState } from "@/components/layout/empty-state"
import { PROJECT_TYPE_LABELS } from "@/config/domain"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import type { ProjectRow } from "@/server/modules/projects/queries"
import { PriorityBadge, ProjectStatusBadge } from "./badges"
import { ProgressBar } from "./progress-bar"

const columns: TableColumn<ProjectRow>[] = [
  {
    id: "name",
    header: "Project",
    sortable: true,
    cell: (row) => (
      <div className="min-w-0">
        <Link href={`/projects/${row.id}`} className="block truncate font-medium hover:underline">
          {row.name}
        </Link>
        <span className="block truncate text-xs text-muted-foreground">
          <span className="font-mono">{row.code}</span>
          {row.clientName ? ` · ${row.clientName}` : ""}
        </span>
      </div>
    ),
  },
  { id: "status", header: "Status", cell: (row) => <ProjectStatusBadge status={row.status} /> },
  { id: "type", header: "Type", hideBelow: "lg", cell: (row) => PROJECT_TYPE_LABELS[row.type] },
  { id: "priority", header: "Priority", hideBelow: "md", cell: (row) => <PriorityBadge priority={row.priority} /> },
  {
    id: "progress",
    header: "Progress",
    hideBelow: "md",
    className: "w-40",
    cell: (row) => <ProgressBar done={row.taskDone} total={row.taskTotal} />,
  },
  { id: "dueDate", header: "Deadline", sortable: true, hideBelow: "sm", cell: (row) => formatDate(row.dueDate) },
]

export function ProjectsTable({ result, facets, canCreate }: { result: PageResult<ProjectRow>; facets: Facet[]; canCreate: boolean }) {
  return (
    <TableRender
      columns={columns}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search projects, codes or clients…"
      caption="Projects"
      emptyState={
        <EmptyState
          title="No projects yet"
          description={canCreate ? "Create a project to start planning work on the board." : "You will see projects here once you are added to one."}
        />
      }
    />
  )
}
