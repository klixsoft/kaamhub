import type { Metadata } from "next"
import { Suspense } from "react"
import { PriorityBadge, ProjectStatusBadge } from "@/components/projects/badges"
import { ProjectForm } from "@/components/projects/project-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PROJECT_TYPE_LABELS } from "@/config/domain"
import { formatDate } from "@/lib/format"
import { loadProjectContext } from "@/server/modules/projects/context"

export const metadata: Metadata = { title: "Overview" }

async function Overview({ params }: { params: PageProps<"/projects/[projectId]/overview">["params"] }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)

  if (access.canManage) {
    return (
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Project details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectForm
            defaults={{
              id: project.id,
              code: project.code,
              name: project.name,
              description: project.description,
              status: project.status,
              type: project.type,
              priority: project.priority,
              startDate: project.startDate,
              dueDate: project.dueDate,
              client: project.clientId && project.clientName ? { value: project.clientId, label: project.clientName } : null,
            }}
          />
        </CardContent>
      </Card>
    )
  }

  const details = [
    { label: "Status", value: <ProjectStatusBadge status={project.status} /> },
    { label: "Type", value: PROJECT_TYPE_LABELS[project.type] },
    { label: "Priority", value: <PriorityBadge priority={project.priority} /> },
    { label: "Client", value: project.clientName ?? "Internal" },
    { label: "Start date", value: formatDate(project.startDate) },
    { label: "Deadline", value: formatDate(project.dueDate) },
  ]

  return (
    <Card className="max-w-4xl">
      <CardHeader>
        <CardTitle>Project details</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          {details.map((detail) => (
            <div key={detail.label}>
              <dt className="text-xs text-muted-foreground">{detail.label}</dt>
              <dd className="text-sm">{detail.value}</dd>
            </div>
          ))}
        </dl>
        {project.description ? <p className="text-sm whitespace-pre-wrap">{project.description}</p> : null}
      </CardContent>
    </Card>
  )
}

export default function ProjectOverviewPage({ params }: PageProps<"/projects/[projectId]/overview">) {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full max-w-4xl" />}>
      <Overview params={params} />
    </Suspense>
  )
}
