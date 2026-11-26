import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { RepositoryManager } from "@/components/projects/repository-manager"
import { SectionHeading } from "@/components/layout/section-heading"
import { Skeleton } from "@/components/ui/skeleton"
import { can } from "@/server/auth/session"
import { isGithubAppConfigured } from "@/server/modules/github/client"
import { loadProjectContext } from "@/server/modules/projects/context"
import { listProjectRepositories } from "@/server/modules/projects/queries"
import { requireModule } from "@/server/modules/settings/guards"

export const metadata: Metadata = { title: "Repositories" }

async function Repositories({ params }: { params: PageProps<"/projects/[projectId]/repositories">["params"] }) {
  const { projectId } = await params
  const { user, access, project } = await loadProjectContext(projectId)
  await requireModule("github")
  if (access.isClientViewer) notFound()
  const repositories = await listProjectRepositories(project.id)
  const canLink = access.canManage && (can(user, "github:manage") || user.role === "project_manager")

  return (
    <RepositoryManager
      projectId={project.id}
      repositories={repositories}
      canLink={canLink}
      canCreate={canLink && can(user, "github:manage")}
      githubConfigured={await isGithubAppConfigured()}
    />
  )
}

export default function ProjectRepositoriesPage({ params }: PageProps<"/projects/[projectId]/repositories">) {
  return (
    <>
      <SectionHeading title="Repositories" description="GitHub repositories linked to this project and who has access." />
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <Repositories params={params} />
      </Suspense>
    </>
  )
}
