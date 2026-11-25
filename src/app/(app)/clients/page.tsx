import type { Metadata } from "next"
import { Suspense } from "react"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { ClientsTable } from "@/components/clients/clients-table"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { parseListParams } from "@/lib/list-params"
import { can, requirePermission } from "@/server/auth/session"
import { CLIENT_LIST_CONFIG, clientFacets, listClients } from "@/server/modules/clients/queries"

export const metadata: Metadata = { title: "Clients" }

async function AddClientAction() {
  const user = await requirePermission("clients:read")
  return can(user, "clients:write") ? <ClientFormDialog /> : null
}

async function ClientsData({ searchParams }: { searchParams: PageProps<"/clients">["searchParams"] }) {
  await requirePermission("clients:read")
  const params = parseListParams(await searchParams, CLIENT_LIST_CONFIG)
  const [result, facets] = await Promise.all([listClients(params), clientFacets(params)])
  return <ClientsTable result={result} facets={facets} />
}

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <PageHeader
      title="Clients"
      subtitle="Companies you deliver projects for."
      actions={
        <Suspense fallback={null}>
          <AddClientAction />
        </Suspense>
      }
    >
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <ClientsData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
