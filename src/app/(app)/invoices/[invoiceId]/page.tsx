import type { Metadata } from "next"
import { Suspense } from "react"
import { CreditNotesSection } from "@/components/invoices/credit-notes-section"
import { InvoiceActions } from "@/components/invoices/invoice-actions"
import { InvoiceStatusBadge, isOverdue } from "@/components/invoices/invoice-status-badge"
import { InvoiceSummary } from "@/components/invoices/invoice-summary"
import { PaymentsList } from "@/components/invoices/payments-list"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { balanceDue, refundDue } from "@/lib/invoice-math"
import { roundMoney } from "@/lib/money"
import { todayIso } from "@/lib/dates"
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
  const outstanding = balanceDue(invoice)
  const canManage = can(user, "finance:write")
  const issued = invoice.status !== "draft" && invoice.status !== "cancelled"
  const creditable = roundMoney(invoice.total - invoice.amountCredited)

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
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} outstanding={outstanding} today={today} canManage={canManage} />
      }
      className="max-w-5xl"
    >
      <InvoiceSummary invoice={view} />
      {invoice.status !== "draft" ? <PaymentsList payments={invoice.payments} currency={invoice.currency} outstanding={outstanding} refund={refundDue(invoice)} /> : null}
      {issued ? (
        <CreditNotesSection
          invoiceId={invoice.id}
          creditNotes={invoice.creditNotes}
          invoiceTaxes={invoice.taxes}
          currency={invoice.currency}
          available={creditable}
          invoiceDate={invoice.issueDate}
          today={today}
          canManage={canManage}
          canIssue={canManage && creditable > 0}
        />
      ) : null}
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
