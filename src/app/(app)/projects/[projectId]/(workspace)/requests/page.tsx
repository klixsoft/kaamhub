import type { Metadata } from "next"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { SectionHeading } from "@/components/layout/section-heading"
import { RequestsTable } from "@/components/requests/requests-table"
import { parseListParams } from "@/lib/list-params"
import { loadProjectContext } from "@/server/modules/projects/context"
import { listRequests, REQUEST_LIST_CONFIG, requestFacets } from "@/server/modules/requests/queries"

export const metadata: Metadata = { title: "Requests" }

type RequestsPageProps = PageProps<"/projects/[projectId]/requests">

async function Requests({ params, searchParams }: Pick<RequestsPageProps, "params" | "searchParams">) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  const listParams = parseListParams(await searchParams, REQUEST_LIST_CONFIG)
  const [result, facets] = await Promise.all([listRequests(project.id, listParams), requestFacets(project.id, listParams)])
  return <RequestsTable projectId={project.id} projectCode={project.code} result={result} facets={facets} canRaise={access.isClientViewer} />
}

export default function ProjectRequestsPage({ params, searchParams }: RequestsPageProps) {
  return (
    <>
      <SectionHeading title="Requests" description="Problems and changes raised by the client. Each request is a card on the board." />
      <Suspense fallback={<TableSkeleton columns={4} />}>
        <Requests params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}
