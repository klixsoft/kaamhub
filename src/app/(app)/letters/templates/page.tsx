import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { LettersNav } from "@/components/letters/letters-nav"
import { TemplatesList } from "@/components/letters/templates-list"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { listTemplates } from "@/server/modules/letters/queries"

export const metadata: Metadata = { title: "Letter templates" }

async function Templates() {
  await requirePermission("letters:manage")
  return <TemplatesList templates={await listTemplates({ includeArchived: true })} />
}

export default function LetterTemplatesPage() {
  return (
    <PageHeader title="Letter templates" subtitle="Reusable letters with placeholders that are filled in for each person." actions={<LettersNav current="/letters/templates" />} className="max-w-5xl">
      <Suspense fallback={<Skeleton className="h-80 w-full" />}>
        <Templates />
      </Suspense>
    </PageHeader>
  )
}
