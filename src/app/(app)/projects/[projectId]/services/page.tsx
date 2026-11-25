import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ServicesManager } from "@/components/services/services-manager"
import { Skeleton } from "@/components/ui/skeleton"
import { todayIso } from "@/lib/nepali-date"
import { can } from "@/server/auth/session"
import { loadProjectContext } from "@/server/modules/projects/context"
import { listProjectServices } from "@/server/modules/services/queries"
import { getCurrencyFormat, getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Services" }

async function Services({ params }: { params: PageProps<"/projects/[projectId]/services">["params"] }) {
  const { projectId } = await params
  const { user, access, project } = await loadProjectContext(projectId)
  if (access.isClientViewer || !project.managesInfrastructure || !(access.canManage || can(user, "finance:read"))) notFound()
  const [services, currency, billing] = await Promise.all([listProjectServices(project.id), getCurrencyFormat(), getSettings("billing")])

  return (
    <ServicesManager
      projectId={project.id}
      services={services}
      canManage={can(user, "finance:write")}
      hasClient={project.clientId !== null}
      currency={currency}
      defaultTreatment={billing.taxRegistration === "vat" ? "vat" : "exempt"}
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
