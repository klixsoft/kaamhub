import type { Metadata } from "next"
import { forbidden, redirect } from "next/navigation"
import { Suspense } from "react"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { todayIso } from "@/lib/nepali-date"
import { can } from "@/server/auth/session"
import { loadInvoice } from "@/server/modules/invoices/context"
import { getCurrencyFormat, getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Edit invoice" }

async function EditInvoiceForm({ params }: { params: PageProps<"/invoices/[invoiceId]/edit">["params"] }) {
  const { invoiceId } = await params
  const { user, invoice } = await loadInvoice(invoiceId)
  if (!can(user, "finance:write")) forbidden()
  if (invoice.status !== "draft") redirect(`/invoices/${invoice.id}`)
  const [billing, currency] = await Promise.all([getSettings("billing"), getCurrencyFormat()])

  return (
    <InvoiceForm
      currency={currency}
      today={todayIso()}
      paymentTermsDays={billing.paymentTermsDays}
      defaultTreatment={invoice.taxTreatment}
      defaults={{
        invoiceId: invoice.id,
        client: { value: invoice.clientId, label: invoice.clientName },
        project: invoice.projectId && invoice.projectName ? { value: invoice.projectId, label: invoice.projectName } : null,
        taxTreatment: invoice.taxTreatment,
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        discount: invoice.discount,
        notes: invoice.notes,
        items: invoice.items,
      }}
    />
  )
}

export default function EditInvoicePage({ params }: PageProps<"/invoices/[invoiceId]/edit">) {
  return (
    <PageHeader title="Edit draft invoice" className="max-w-6xl">
      <Suspense fallback={<Skeleton className="h-[36rem] w-full" />}>
        <EditInvoiceForm params={params} />
      </Suspense>
    </PageHeader>
  )
}
