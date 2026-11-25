import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ServicesManager } from "@/components/services/services-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { todayIso } from "@/lib/dates"
import { can } from "@/server/auth/session"
import { loadProjectContext } from "@/server/modules/projects/context"
import { listProjectServices } from "@/server/modules/services/queries"
import { currencyFormatOf, getSettings } from "@/server/modules/settings/queries"
import { requireModule } from "@/server/modules/settings/guards"

export const metadata: Metadata = { title: "Services" }

async function Services({ params }: { params: PageProps<"/projects/[projectId]/services">["params"] }) {
  const { projectId } = await params
  const { user, access, project } = await loadProjectContext(projectId)
  await requireModule("services")
  if (access.isClientViewer || !project.managesInfrastructure || !(access.canManage || can(user, "finance:read"))) notFound()
  const [services, billing] = await Promise.all([listProjectServices(project.id), getSettings("billing")])

  return (
    <ServicesManager
      projectId={project.id}
      services={services}
      canManage={can(user, "finance:write")}
      hasClient={project.clientId !== null}
      currency={currencyFormatOf(billing)}
      today={todayIso()}
    />
  )
}

export default function ProjectServicesPage({ params }: PageProps<"/projects/[projectId]/services">) {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <Services params={params} />
    </Suspense>
  )
}
