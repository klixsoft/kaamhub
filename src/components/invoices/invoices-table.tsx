"use client"

import { RepeatIcon } from "lucide-react"
import Link from "next/link"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { EmptyState } from "@/components/layout/empty-state"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import { formatMoney } from "@/lib/money"
import type { InvoiceRow } from "@/server/modules/invoices/queries"
import { InvoiceStatusBadge, isOverdue } from "./invoice-status-badge"

function buildColumns(today: string): TableColumn<InvoiceRow>[] {
  return [
    {
      id: "number",
      header: "Invoice",
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <Link href={`/invoices/${row.id}`} className="flex items-center gap-1.5 font-medium hover:underline">
            <span className="font-mono">{row.number ?? "Draft"}</span>
            {row.fromService ? <RepeatIcon className="size-3.5 text-muted-foreground" aria-label="Recurring service" /> : null}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">
            {row.clientName}
            {row.projectName ? ` · ${row.projectName}` : ""}
          </span>
        </div>
      ),
    },
    { id: "issueDate", header: "Date", sortable: true, hideBelow: "sm", cell: (row) => formatDate(row.issueDate) },
    { id: "dueDate", header: "Due", sortable: true, hideBelow: "md", cell: (row) => formatDate(row.dueDate) },
    {
      id: "total",
      header: "Amount",
      sortable: true,
      className: "text-right tabular-nums",
      cell: (row) => (
        <div>
          <span className="block">{formatMoney(row.total, row.currency)}</span>
          {row.amountPaid > 0 && row.amountPaid < row.total ? (
            <span className="block text-xs text-muted-foreground">Paid {formatMoney(row.amountPaid, row.currency)}</span>
          ) : null}
        </div>
      ),
    },
    { id: "status", header: "Status", cell: (row) => <InvoiceStatusBadge status={row.status} overdue={isOverdue(row.status, row.dueDate, today)} /> },
  ]
}

export function InvoicesTable({ result, facets, today }: { result: PageResult<InvoiceRow>; facets: Facet[]; today: string }) {
  return (
    <TableRender
      columns={buildColumns(today)}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search invoice number or client…"
      caption="Invoices"
      emptyState={<EmptyState title="No invoices yet" description="Invoices you create, and drafts from recurring services, appear here." />}
    />
  )
}
