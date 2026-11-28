"use client"

import { LifeBuoyIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { FormDialog } from "@/components/forms/form-dialog"
import { EmptyState } from "@/components/layout/empty-state"
import { PriorityBadge } from "@/components/projects/badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TASK_TYPE_LABELS } from "@/config/domain"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import type { RequestRow } from "@/server/modules/requests/queries"
import { RequestForm } from "./request-form"

interface RequestsTableProps {
  projectId: string
  projectCode: string
  result: PageResult<RequestRow>
  facets: Facet[]
  canRaise: boolean
}

export function RequestsTable({ projectId, projectCode, result, facets, canRaise }: RequestsTableProps) {
  const router = useRouter()
  const columns: TableColumn<RequestRow>[] = [
    {
      id: "number",
      header: "Request",
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <Link href={`/projects/${projectId}/board?task=${row.number}`} className="block truncate font-medium hover:underline">
            {row.title}
          </Link>
          <span className="text-xs text-muted-foreground">
            <span className="font-mono">
              {projectCode}-{row.number}
            </span>{" "}
            · {TASK_TYPE_LABELS[row.type]} · {row.requestedBy ?? "Former contact"}
          </span>
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (row) => <Badge variant="outline">{row.status}</Badge> },
    { id: "priority", header: "Urgency", hideBelow: "sm", cell: (row) => <PriorityBadge priority={row.priority} /> },
    { id: "createdAt", header: "Raised", sortable: true, hideBelow: "md", cell: (row) => formatDate(row.createdAt) },
    { id: "updatedAt", header: "Last update", sortable: true, hideBelow: "lg", cell: (row) => formatDate(row.updatedAt) },
  ]

  const raise = canRaise ? (
    <FormDialog
      title="New request"
      description="Tell the project team what you need. It appears on the project board and you are notified as it moves."
      trigger={
        <Button>
          <PlusIcon aria-hidden />
          New request
        </Button>
      }
    >
      {(close) => (
        <RequestForm
          projectId={projectId}
          onSaved={() => {
            close()
            router.refresh()
          }}
        />
      )}
    </FormDialog>
  ) : null

  return (
    <TableRender
      columns={columns}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search requests…"
      caption="Client requests"
      toolbarActions={raise}
      emptyState={
        <EmptyState
          icon={LifeBuoyIcon}
          title="No requests yet"
          description={canRaise ? "Report a problem or ask for a change. The project team is notified straight away." : "Requests your client raises from their portal appear here and on the board."}
          action={raise}
        />
      }
    />
  )
}
