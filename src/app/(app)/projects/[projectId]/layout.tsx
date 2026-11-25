import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectStatusBadge } from "@/components/projects/badges"
import { ProjectTabs } from "@/components/projects/project-tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { can } from "@/server/auth/session"
import { loadProjectContext } from "@/server/modules/projects/context"
import { getModules } from "@/server/modules/settings/queries"

async function ProjectShell({ params, children }: { params: LayoutProps<"/projects/[projectId]">["params"]; children: React.ReactNode }) {
  const { projectId } = await params
  const { user, access, project } = await loadProjectContext(projectId)
  const modules = await getModules()
  const showServices = modules.services && project.recurringBilling && !access.isClientViewer && (access.canManage || can(user, "finance:read"))
  const base = `/projects/${project.id}`
  const tabs = [
    { href: base, label: "Board" },
    { href: `${base}/overview`, label: "Overview" },
    ...(access.isClientViewer ? [] : [{ href: `${base}/team`, label: "Team" }]),
    ...(modules.github && !access.isClientViewer ? [{ href: `${base}/repositories`, label: "Repositories" }] : []),
    ...(showServices ? [{ href: `${base}/services`, label: "Services" }] : []),
  ]

  return (
    <PageHeader
      title={project.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-mono">{project.code}</span>
          {project.clientName ? <span>· {project.clientName}</span> : null}
          <ProjectStatusBadge status={project.status} />
        </span>
      }
    >
      <ProjectTabs tabs={tabs} />
      {children}
    </PageHeader>
  )
}

export default function ProjectLayout({ params, children }: LayoutProps<"/projects/[projectId]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-4 p-4 md:p-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <ProjectShell params={params}>{children}</ProjectShell>
    </Suspense>
  )
}
