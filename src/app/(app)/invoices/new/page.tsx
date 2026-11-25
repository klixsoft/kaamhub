import type { Metadata } from "next"
import { Suspense } from "react"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { todayIso } from "@/lib/dates"
import { requirePermission } from "@/server/auth/session"
import { currencyFormatOf, getSettings } from "@/server/modules/settings/queries"
import { requireModule } from "@/server/modules/settings/guards"

export const metadata: Metadata = { title: "New invoice" }

async function NewInvoiceForm() {
  await requirePermission("finance:write")
  await requireModule("invoices")
  const billing = await getSettings("billing")
  return (
    <InvoiceForm
      currency={currencyFormatOf(billing)}
      today={todayIso()}
      paymentTermsDays={billing.paymentTermsDays}
    />
  )
}

export default function NewInvoicePage() {
  return (
    <PageHeader title="New invoice" subtitle="Saved as a draft. It gets a number when you issue it." className="max-w-6xl">
      <Suspense fallback={<Skeleton className="h-[36rem] w-full" />}>
        <NewInvoiceForm />
      </Suspense>
    </PageHeader>
  )
}
