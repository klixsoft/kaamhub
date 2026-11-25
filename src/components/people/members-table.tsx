"use client"

import Link from "next/link"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { EmptyState } from "@/components/layout/empty-state"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ENGAGEMENT_TYPE_LABELS } from "@/config/domain"
import { formatDate, initials } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import type { MemberRow } from "@/server/modules/people/queries"
import { RoleBadge, UserStatusBadge } from "./badges"

const columns: TableColumn<MemberRow>[] = [
  {
    id: "name",
    header: "Name",
    sortable: true,
    cell: (row) => (
      <div className="flex min-w-0 items-center gap-3">
        <Avatar className="size-8">
          {row.image ? <AvatarImage src={row.image} alt="" /> : null}
          <AvatarFallback>{initials(row.name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <Link href={`/people/${row.id}`} className="block truncate font-medium hover:underline">
            {row.name}
          </Link>
          <span className="block truncate text-xs text-muted-foreground">{row.email}</span>
        </div>
      </div>
    ),
  },
  { id: "role", header: "Role", cell: (row) => <RoleBadge role={row.role} /> },
  {
    id: "engagement",
    header: "Engagement",
    hideBelow: "md",
    cell: (row) => (row.engagementType ? ENGAGEMENT_TYPE_LABELS[row.engagementType] : "—"),
  },
  {
    id: "department",
    header: "Department",
    hideBelow: "lg",
    cell: (row) => (
      <div className="min-w-0">
        <span className="block truncate">{row.departmentName ?? "—"}</span>
        {row.designationName ? <span className="block truncate text-xs text-muted-foreground">{row.designationName}</span> : null}
      </div>
    ),
  },
  { id: "joinedOn", header: "Joined", sortable: true, hideBelow: "lg", cell: (row) => formatDate(row.joinedOn) },
  { id: "status", header: "Status", cell: (row) => <UserStatusBadge status={row.status} /> },
]

export function MembersTable({ result, facets }: { result: PageResult<MemberRow>; facets: Facet[] }) {
  return (
    <TableRender
      columns={columns}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search name, email or code…"
      caption="Team members"
      emptyState={<EmptyState title="No team members yet" description="Invite employees and freelancers to start assigning work." />}
    />
  )
}
