import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { BillingSettingsForm } from "@/components/settings/billing-settings-form"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { getSettings } from "@/server/modules/settings/queries"
import { requireModule } from "@/server/modules/settings/guards"

export const metadata: Metadata = { title: "Billing" }

async function BillingSettingsContent() {
  await requirePermission("settings:manage")
  await requireModule("invoices")
  return <BillingSettingsForm defaults={await getSettings("billing")} />
}

export default function BillingSettingsPage() {
  return (
    <PageHeader title="Billing" subtitle="Tax registration, currency and invoice defaults." className="max-w-5xl">
      <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
        <BillingSettingsContent />
      </Suspense>
    </PageHeader>
  )
}
