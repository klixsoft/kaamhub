"use client"

import Link from "next/link"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { EmptyState } from "@/components/layout/empty-state"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import type { ClientRow } from "@/server/modules/clients/queries"
import { ClientStatusBadge } from "./client-status-badge"

const columns: TableColumn<ClientRow>[] = [
  {
    id: "name",
    header: "Client",
    sortable: true,
    cell: (row) => (
      <Link href={`/clients/${row.id}`} className="font-medium hover:underline">
        {row.name}
      </Link>
    ),
  },
  {
    id: "contact",
    header: "Contact",
    hideBelow: "md",
    cell: (row) => (
      <div className="min-w-0 text-sm">
        <span className="block truncate">{row.email ?? "—"}</span>
        {row.phone ? <span className="block truncate text-xs text-muted-foreground">{row.phone}</span> : null}
      </div>
    ),
  },
  { id: "projects", header: "Projects", className: "text-right tabular-nums", cell: (row) => row.projectCount },
  { id: "createdAt", header: "Added", sortable: true, hideBelow: "lg", cell: (row) => formatDate(row.createdAt) },
  { id: "status", header: "Status", cell: (row) => <ClientStatusBadge status={row.status} /> },
]

export function ClientsTable({ result, facets }: { result: PageResult<ClientRow>; facets: Facet[] }) {
  return (
    <TableRender
      columns={columns}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search clients…"
      caption="Clients"
      emptyState={<EmptyState title="No clients yet" description="Add a client to link projects and give them portal access." />}
    />
  )
}
