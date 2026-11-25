import { PlusIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { ButtonLink } from "@/components/layout/button-link"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectsTable } from "@/components/projects/projects-table"
import { parseListParams } from "@/lib/list-params"
import { can, requireUser } from "@/server/auth/session"
import { listProjects, PROJECT_LIST_CONFIG, projectFacets } from "@/server/modules/projects/queries"

export const metadata: Metadata = { title: "Projects" }

async function NewProjectAction() {
  const user = await requireUser()
  if (!can(user, "projects:create")) return null
  return (
    <ButtonLink href="/projects/new">
      <PlusIcon aria-hidden />
      New project
    </ButtonLink>
  )
}

async function ProjectsData({ searchParams }: { searchParams: PageProps<"/projects">["searchParams"] }) {
  const user = await requireUser()
  const params = parseListParams(await searchParams, PROJECT_LIST_CONFIG)
  const [result, facets] = await Promise.all([listProjects(user, params), projectFacets(user, params)])
  return <ProjectsTable result={result} facets={facets} canCreate={can(user, "projects:create")} />
}

export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <PageHeader
      title="Projects"
      subtitle="Track delivery across every client and internal project."
      actions={
        <Suspense fallback={null}>
          <NewProjectAction />
        </Suspense>
      }
    >
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <ProjectsData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
