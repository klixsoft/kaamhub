import type { Metadata } from "next"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { ServicesTable } from "@/components/services/services-table"
import { todayIso } from "@/lib/dates"
import { parseListParams } from "@/lib/list-params"
import { can, requirePermission } from "@/server/auth/session"
import { getProjectOption, listServices, SERVICE_LIST_CONFIG, serviceFacets } from "@/server/modules/services/queries"
import { requireModule } from "@/server/modules/settings/guards"
import { currencyFormatOf, getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Services" }

async function ServicesData({ searchParams }: { searchParams: PageProps<"/services">["searchParams"] }) {
  const user = await requirePermission("finance:read")
  await requireModule("services")
  const params = parseListParams(await searchParams, SERVICE_LIST_CONFIG)
  const [result, facets, billing, defaultProject] = await Promise.all([
    listServices(params),
    serviceFacets(params),
    getSettings("billing"),
    getProjectOption(params.filters.project?.[0]),
  ])
  return (
    <ServicesTable
      result={result}
      facets={facets}
      currency={currencyFormatOf(billing)}
      today={todayIso()}
      canManage={can(user, "finance:write")}
      defaultProject={defaultProject}
    />
  )
}

export default function ServicesPage({ searchParams }: PageProps<"/services">) {
  return (
    <PageHeader title="Services" subtitle="Subscriptions, retainers and maintenance plans billed on a schedule. Drafts are prepared before each billing date.">
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <ServicesData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
