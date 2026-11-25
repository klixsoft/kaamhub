"use client"

import { FileTextIcon, MoreHorizontalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { TableRender } from "@/components/data-table/table-render"
import type { TableColumn } from "@/components/data-table/types"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormDialog } from "@/components/forms/form-dialog"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { BILLING_CYCLE_LABELS, type CurrencyFormat, SERVICE_STATUS_LABELS } from "@/config/finance"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate } from "@/lib/format"
import type { Facet, PageResult } from "@/lib/list-params"
import { formatMoney } from "@/lib/money"
import type { Option } from "@/lib/options"
import { cn } from "@/lib/utils"
import { deleteService, invoiceServiceNow } from "@/server/modules/services/actions"
import type { ServiceListRow } from "@/server/modules/services/queries"
import { ServiceForm } from "./service-form"

interface ServicesTableProps {
  result: PageResult<ServiceListRow>
  facets: Facet[]
  currency: CurrencyFormat
  today: string
  canManage: boolean
  defaultProject: Option | null
}

function RowActions({ service, currency, today }: { service: ServiceListRow; currency: CurrencyFormat; today: string }) {
  const router = useRouter()
  const { isPending, run } = useServerAction()
  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<"bill" | "delete" | null>(null)
  const canBill = service.status === "active" && service.clientName !== null

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${service.name}`} disabled={isPending} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled={!canBill} onClick={() => setConfirm("bill")}>
            <FileTextIcon aria-hidden />
            Bill next period
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <PencilIcon aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => setConfirm("delete")}>
            <Trash2Icon aria-hidden />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit {service.name}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <ServiceForm
              service={service}
              project={{ value: service.projectId, label: service.projectName }}
              currencySymbol={currency.symbol}
              today={today}
              onSaved={() => setEditing(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirm === "bill"}
        onOpenChange={(open) => setConfirm(open ? "bill" : null)}
        title="Create the next invoice now?"
        description={`A draft invoice for the period starting ${formatDate(service.nextBillingOn)} is created and the next billing date moves forward one cycle.`}
        confirmLabel="Create draft"
        onConfirm={() =>
          run(() => invoiceServiceNow({ serviceId: service.id }), "Draft invoice created", (invoice) => {
            if (invoice) router.push(`/invoices/${invoice.id}`)
          })
        }
      />
      <ConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => setConfirm(open ? "delete" : null)}
        title={`Delete ${service.name}?`}
        description="Existing invoices stay. Future recurring drafts stop. To keep the history, set the status to Cancelled instead."
        confirmLabel="Delete"
        destructive
        onConfirm={() => run(() => deleteService({ serviceId: service.id }), "Service deleted")}
      />
    </>
  )
}

function buildColumns(currency: CurrencyFormat, today: string, canManage: boolean): TableColumn<ServiceListRow>[] {
  const columns: TableColumn<ServiceListRow>[] = [
    {
      id: "name",
      header: "Service",
      sortable: true,
      cell: (row) => (
        <div className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate font-medium">{row.name}</span>
            {row.categoryName ? <Badge variant="secondary">{row.categoryName}</Badge> : null}
          </span>
          <Link href={`/projects/${row.projectId}`} className="block truncate text-xs text-muted-foreground hover:underline">
            {row.projectName}
            {row.clientName ? ` · ${row.clientName}` : " · No client"}
          </Link>
        </div>
      ),
    },
    {
      id: "amount",
      header: "Amount",
      sortable: true,
      className: "text-right tabular-nums",
      cell: (row) => (
        <div>
          <span className="block">{formatMoney(row.amount, currency)}</span>
          <span className="block text-xs text-muted-foreground">{BILLING_CYCLE_LABELS[row.billingCycle]}</span>
        </div>
      ),
    },
    { id: "nextBillingOn", header: "Next bill", sortable: true, hideBelow: "sm", cell: (row) => formatDate(row.nextBillingOn) },
    {
      id: "expiresOn",
      header: "Renewal",
      sortable: true,
      hideBelow: "md",
      cell: (row) => <span className={cn(row.expiresOn && row.expiresOn < today && "font-medium text-destructive")}>{formatDate(row.expiresOn)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <Badge variant={row.status === "active" ? "outline" : "secondary"}>{SERVICE_STATUS_LABELS[row.status]}</Badge>,
    },
  ]
  if (canManage) {
    columns.push({ id: "actions", header: "", className: "w-10 text-right", cell: (row) => <RowActions service={row} currency={currency} today={today} /> })
  }
  return columns
}

export function ServicesTable({ result, facets, currency, today, canManage, defaultProject }: ServicesTableProps) {
  return (
    <TableRender
      columns={buildColumns(currency, today, canManage)}
      result={result}
      facets={facets}
      getRowId={(row) => row.id}
      searchPlaceholder="Search services, projects or clients…"
      caption="Recurring services"
      toolbarActions={
        canManage ? (
          <FormDialog
            title="Add recurring service"
            trigger={
              <Button>
                <PlusIcon aria-hidden />
                Add service
              </Button>
            }
          >
            {(close) => <ServiceForm project={defaultProject} currencySymbol={currency.symbol} today={today} onSaved={close} />}
          </FormDialog>
        ) : null
      }
      emptyState={
        <EmptyState title="No recurring services yet" description="Add subscriptions, retainers or maintenance plans you bill clients for regularly." />
      }
    />
  )
}
