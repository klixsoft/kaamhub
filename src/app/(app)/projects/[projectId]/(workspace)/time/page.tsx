import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { SectionHeading } from "@/components/layout/section-heading"
import { ProjectTimeTable } from "@/components/time/project-time-table"
import { parseListParams } from "@/lib/list-params"
import { loadProjectContext } from "@/server/modules/projects/context"
import { projectTime, projectTimeFacets, TIME_LIST_CONFIG } from "@/server/modules/time/queries"

export const metadata: Metadata = { title: "Time" }

type TimePageProps = PageProps<"/projects/[projectId]/time">

async function ProjectTime({ params, searchParams }: Pick<TimePageProps, "params" | "searchParams">) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  if (access.isClientViewer) notFound()
  const listParams = parseListParams(await searchParams, TIME_LIST_CONFIG)
  const [time, facets] = await Promise.all([projectTime(project.id, listParams), projectTimeFacets(project.id, listParams)])
  return <ProjectTimeTable projectId={project.id} projectCode={project.code} facets={facets} {...time} />
}

export default function ProjectTimePage({ params, searchParams }: TimePageProps) {
  return (
    <>
      <SectionHeading title="Time" description="Hours logged by the team on this project." />
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <ProjectTime params={params} searchParams={searchParams} />
      </Suspense>
    </>
  )
}
