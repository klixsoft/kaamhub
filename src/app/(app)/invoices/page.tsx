import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import { forbidden } from "next/navigation"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { InvoicesTable } from "@/components/invoices/invoices-table"
import { ButtonLink } from "@/components/layout/button-link"
import { PageHeader } from "@/components/layout/page-header"
import { parseListParams } from "@/lib/list-params"
import { todayIso } from "@/lib/dates"
import { can, requireUser } from "@/server/auth/session"
import { canSeeInvoices } from "@/server/modules/invoices/access"
import { INVOICE_LIST_CONFIG, invoiceFacets, listInvoices } from "@/server/modules/invoices/queries"

export const metadata: Metadata = { title: "Invoices" }

async function NewInvoiceAction() {
  const user = await requireUser()
  if (!can(user, "finance:write")) return null
  return (
    <ButtonLink href="/invoices/new">
      <PlusIcon aria-hidden />
      New invoice
    </ButtonLink>
  )
}

async function InvoicesData({ searchParams }: { searchParams: PageProps<"/invoices">["searchParams"] }) {
  const user = await requireUser()
  if (!canSeeInvoices(user)) forbidden()
  const params = parseListParams(await searchParams, INVOICE_LIST_CONFIG)
  const [result, facets] = await Promise.all([listInvoices(user, params), invoiceFacets(user, params)])
  return <InvoicesTable result={result} facets={facets} today={todayIso()} />
}

export default function InvoicesPage({ searchParams }: PageProps<"/invoices">) {
  return (
    <PageHeader
      title="Invoices"
      subtitle="Tax invoices and bills for your clients."
      actions={
        <Suspense fallback={null}>
          <NewInvoiceAction />
        </Suspense>
      }
    >
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <InvoicesData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
