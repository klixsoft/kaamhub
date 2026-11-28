"use client"

import { FileSignatureIcon } from "lucide-react"
import Link from "next/link"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { letterPdfUrl } from "@/config/letters"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import type { LetterRow, LetterTemplateRow } from "@/server/modules/letters/queries"
import { IssueLetterDialog } from "./issue-letter-dialog"
import { LetterActions } from "./letter-actions"

const columns: TableColumn<LetterRow>[] = [
  {
    id: "number",
    header: "Letter",
    sortable: true,
    cell: (row) => (
      <div className="min-w-0">
        <a href={letterPdfUrl(row.id)} target="_blank" rel="noopener" className="block truncate font-medium hover:underline">
          {row.title}
        </a>
        <span className="font-mono text-xs text-muted-foreground">{row.number}</span>
      </div>
    ),
  },
  {
    id: "recipient",
    header: "Issued to",
    sortable: true,
    cell: (row) => (
      <Link href={`/people/${row.recipientId}`} className="hover:underline">
        {row.recipientName}
      </Link>
    ),
  },
  { id: "letterDate", header: "Date", sortable: true, hideBelow: "sm", cell: (row) => formatDate(row.letterDate) },
  { id: "issuedBy", header: "Issued by", hideBelow: "md", cell: (row) => row.issuedBy ?? "—" },
  {
    id: "status",
    header: "Status",
    hideBelow: "sm",
    cell: (row) => (row.revokedAt ? <Badge variant="destructive">Revoked</Badge> : <Badge variant="outline">Issued</Badge>),
  },
  { id: "actions", header: "", className: "w-10 text-right", cell: (row) => <LetterActions letter={row} canManage /> },
]

interface LettersTableProps {
  result: PageResult<LetterRow>
  facets: Facet[]
  templates: LetterTemplateRow[]
  today: string
}

export function LettersTable({ result, facets, templates, today }: LettersTableProps) {
  return (
    <TableRender
      columns={columns}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search by number, title or person…"
      caption="Issued letters"
      toolbarActions={<IssueLetterDialog templates={templates} today={today} />}
      emptyState={
        <EmptyState
          icon={FileSignatureIcon}
          title="No letters issued yet"
          description="Issue offer letters, contracts, NDAs and certificates on your letterhead. Set up the letterhead and templates first."
        />
      }
    />
  )
}
