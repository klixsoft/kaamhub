import type { Metadata } from "next"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { DocumentsTable } from "@/components/documents/documents-table"
import { SectionHeading } from "@/components/layout/section-heading"
import { parseListParams } from "@/lib/list-params"
import { DOCUMENT_LIST_CONFIG, documentFacets, listProjectDocuments } from "@/server/modules/documents/queries"
import { loadProjectContext } from "@/server/modules/projects/context"

export const metadata: Metadata = { title: "Documents" }

type DocumentsPageProps = PageProps<"/projects/[projectId]/documents">

async function Documents({ params, searchParams }: Pick<DocumentsPageProps, "params" | "searchParams">) {
  const { projectId } = await params
  const { user, access, project } = await loadProjectContext(projectId)
  const listParams = parseListParams(await searchParams, DOCUMENT_LIST_CONFIG)
  const [result, facets] = await Promise.all([
    listProjectDocuments(project.id, access, user.id, listParams),
    documentFacets(project.id, access, listParams),
  ])
  return <DocumentsTable projectId={project.id} result={result} facets={facets} canUpload={access.canEditTasks} isClientViewer={access.isClientViewer} />
}

export default function ProjectDocumentsPage({ params, searchParams }: DocumentsPageProps) {
  return (
    <>
      <SectionHeading title="Documents" description="Requirements, designs, contracts and other files for this project." />
      <Suspense fallback={<TableSkeleton columns={4} />}>
        <Documents params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}
