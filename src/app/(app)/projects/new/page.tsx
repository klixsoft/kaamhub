import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectForm } from "@/components/projects/project-form"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "New project" }

async function NewProjectForm() {
  await requirePermission("projects:create")
  const { projectCodePrefix } = await getSettings("general")
  return <ProjectForm codePrefix={projectCodePrefix} />
}

export default function NewProjectPage() {
  return (
    <PageHeader title="New project" subtitle="A board with default columns is created automatically." className="max-w-4xl">
      <Card>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <NewProjectForm />
          </Suspense>
        </CardContent>
      </Card>
    </PageHeader>
  )
}
