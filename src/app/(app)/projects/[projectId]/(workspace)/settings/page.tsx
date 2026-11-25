import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { SectionHeading } from "@/components/layout/section-heading"
import { ProjectForm } from "@/components/projects/project-form"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { loadProjectContext } from "@/server/modules/projects/context"
import { getModules } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Project settings" }

async function ProjectSettings({ params }: { params: PageProps<"/projects/[projectId]/settings">["params"] }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  if (!access.canManage) notFound()
  const modules = await getModules()
  const option = (id: string | null, label: string | null) => (id && label ? { value: id, label } : null)

  return (
    <Card className="max-w-4xl">
      <CardContent>
        <ProjectForm
          clientsEnabled={modules.clients}
          defaults={{
            id: project.id,
            code: project.code,
            name: project.name,
            description: project.description,
            status: project.status,
            category: option(project.categoryId, project.categoryName),
            stage: option(project.stageId, project.stageName),
            priority: project.priority,
            startDate: project.startDate,
            dueDate: project.dueDate,
            client: option(project.clientId, project.clientName),
          }}
        />
      </CardContent>
    </Card>
  )
}

export default function ProjectSettingsPage({ params }: PageProps<"/projects/[projectId]/settings">) {
  return (
    <>
      <SectionHeading title="Settings" description="Name, client, stage, dates and description." />
      <Suspense fallback={<Skeleton className="h-[32rem] w-full max-w-4xl" />}>
        <ProjectSettings params={params} />
      </Suspense>
    </>
  )
}
