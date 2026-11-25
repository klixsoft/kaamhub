import type { Metadata } from "next"
import { Suspense } from "react"
import { InvoiceActions } from "@/components/invoices/invoice-actions"
import { InvoiceStatusBadge, isOverdue } from "@/components/invoices/invoice-status-badge"
import { InvoiceSummary } from "@/components/invoices/invoice-summary"
import { PaymentsList } from "@/components/invoices/payments-list"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { roundMoney } from "@/lib/money"
import { todayIso } from "@/lib/nepali-date"
import { can } from "@/server/auth/session"
import { loadInvoice } from "@/server/modules/invoices/context"
import { toInvoiceView } from "@/server/modules/invoices/view"
import { getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Invoice" }

async function InvoiceDetails({ params }: { params: PageProps<"/invoices/[invoiceId]">["params"] }) {
  const { invoiceId } = await params
  const { user, invoice } = await loadInvoice(invoiceId)
  const view = toInvoiceView(invoice, await getSettings("billing"))
  const today = todayIso()
  const outstanding = roundMoney(invoice.total - invoice.amountPaid)

  return (
    <PageHeader
      title={invoice.number ? `Invoice ${invoice.number}` : "Draft invoice"}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          {invoice.clientName}
          <InvoiceStatusBadge status={invoice.status} overdue={isOverdue(invoice.status, invoice.dueDate, today)} />
        </span>
      }
      actions={
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} outstanding={outstanding} today={today} canManage={can(user, "finance:write")} />
      }
      className="max-w-5xl"
    >
      <InvoiceSummary invoice={view} />
      {invoice.status !== "draft" ? <PaymentsList payments={invoice.payments} currency={invoice.currency} outstanding={outstanding} /> : null}
    </PageHeader>
  )
}

export default function InvoicePage({ params }: PageProps<"/invoices/[invoiceId]">) {
  return (
    <Suspense
      fallback={
        <div className="p-6">
          <Skeleton className="h-[40rem] w-full max-w-5xl" />
        </div>
      }
    >
      <InvoiceDetails params={params} />
    </Suspense>
  )
}
