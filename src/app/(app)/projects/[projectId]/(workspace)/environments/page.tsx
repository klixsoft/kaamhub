import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { EnvironmentsManager } from "@/components/environments/environments-manager"
import { SectionHeading } from "@/components/layout/section-heading"
import { Skeleton } from "@/components/ui/skeleton"
import { todayIso } from "@/lib/dates"
import { listProjectEnvironments } from "@/server/modules/environments/queries"
import { loadProjectContext } from "@/server/modules/projects/context"
import { requireModule } from "@/server/modules/settings/guards"

export const metadata: Metadata = { title: "Environments" }

async function Environments({ params }: { params: PageProps<"/projects/[projectId]/environments">["params"] }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  await requireModule("environments")
  if (access.isClientViewer) notFound()
  const environments = await listProjectEnvironments(project.id)
  return <EnvironmentsManager projectId={project.id} environments={environments} canManage={access.canManage} today={todayIso()} />
}

export default function ProjectEnvironmentsPage({ params }: PageProps<"/projects/[projectId]/environments">) {
  return (
    <>
      <SectionHeading title="Environments" description="Production, staging and development URLs with live status, domain and hosting renewals." />
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <Environments params={params} />
      </Suspense>
    </>
  )
}
