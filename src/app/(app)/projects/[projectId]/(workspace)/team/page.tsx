import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { TeamManager } from "@/components/projects/team-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { loadProjectContext } from "@/server/modules/projects/context"
import { listProjectMembers } from "@/server/modules/projects/queries"

export const metadata: Metadata = { title: "Team" }

async function Team({ params }: { params: PageProps<"/projects/[projectId]/team">["params"] }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  if (access.isClientViewer) notFound()
  const members = await listProjectMembers(project.id)
  return <TeamManager projectId={project.id} members={members} canManage={access.canManage} />
}

export default function ProjectTeamPage({ params }: PageProps<"/projects/[projectId]/team">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <Team params={params} />
    </Suspense>
  )
}
