import type { Metadata } from "next"
import { Suspense } from "react"
import { InvoiceForm } from "@/components/invoices/invoice-form"
import { PageHeader } from "@/components/layout/page-header"
import { Skeleton } from "@/components/ui/skeleton"
import { todayIso } from "@/lib/nepali-date"
import { requirePermission } from "@/server/auth/session"
import { getCurrencyFormat, getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "New invoice" }

async function NewInvoiceForm() {
  await requirePermission("finance:write")
  const [billing, currency] = await Promise.all([getSettings("billing"), getCurrencyFormat()])
  return (
    <InvoiceForm
      currency={currency}
      today={todayIso()}
      paymentTermsDays={billing.paymentTermsDays}
      defaultTreatment={billing.taxRegistration === "vat" ? "vat" : "exempt"}
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
