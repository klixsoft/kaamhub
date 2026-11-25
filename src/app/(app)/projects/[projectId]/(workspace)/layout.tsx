import { Suspense } from "react"
import { ProjectStageBadge, ProjectStatusBadge } from "@/components/projects/badges"
import { ProjectNav, type ProjectNavItem } from "@/components/projects/project-nav"
import { Skeleton } from "@/components/ui/skeleton"
import type { ModuleState } from "@/config/modules"
import type { ProjectAccess } from "@/server/modules/projects/access"
import { loadProjectContext } from "@/server/modules/projects/context"
import { getModules } from "@/server/modules/settings/queries"

function navigationFor(base: string, access: ProjectAccess, modules: ModuleState): ProjectNavItem[] {
  const internal = !access.isClientViewer
  return [
    { href: base, label: "Overview", icon: "overview", exact: true },
    { href: `${base}/board`, label: "Board", icon: "board" },
    ...(internal ? [{ href: `${base}/team`, label: "Team", icon: "team" } as const] : []),
    ...(internal && modules.environments ? [{ href: `${base}/environments`, label: "Environments", icon: "environments" } as const] : []),
    ...(internal && modules.github ? [{ href: `${base}/repositories`, label: "Repositories", icon: "repositories" } as const] : []),
    ...(access.canManage ? [{ href: `${base}/settings`, label: "Settings", icon: "settings" } as const] : []),
  ]
}

async function ProjectWorkspace({ params, children }: { params: LayoutProps<"/projects/[projectId]">["params"]; children: React.ReactNode }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  const modules = await getModules()

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:flex-row lg:gap-8">
      <aside className="flex flex-col gap-4 lg:sticky lg:top-16 lg:w-60 lg:shrink-0 lg:self-start">
        <header className="space-y-2">
          <p className="font-mono text-xs text-muted-foreground">{project.code}</p>
          <h1 className="text-xl font-semibold tracking-tight">{project.name}</h1>
          {project.clientName ? <p className="text-sm text-muted-foreground">{project.clientName}</p> : null}
          <div className="flex flex-wrap gap-1.5">
            <ProjectStatusBadge status={project.status} />
            {project.stageName ? <ProjectStageBadge stage={project.stageName} /> : null}
          </div>
        </header>
        <ProjectNav items={navigationFor(`/projects/${project.id}`, access, modules)} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col gap-6">{children}</section>
    </div>
  )
}

export default function ProjectWorkspaceLayout({ params, children }: LayoutProps<"/projects/[projectId]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6 p-4 md:p-6 lg:flex-row">
          <Skeleton className="h-72 w-full lg:w-60" />
          <Skeleton className="h-96 flex-1" />
        </div>
      }
    >
      <ProjectWorkspace params={params}>{children}</ProjectWorkspace>
    </Suspense>
  )
}
