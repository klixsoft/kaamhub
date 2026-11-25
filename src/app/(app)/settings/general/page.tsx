import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { GeneralSettingsForm } from "@/components/settings/general-settings-form"
import { LookupList } from "@/components/settings/lookup-list"
import { ModulesForm } from "@/components/settings/modules-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { getModules, getSettings, listLookups } from "@/server/modules/settings/queries"
import type { LookupKind } from "@/server/modules/settings/schema"
import type { ModuleKey } from "@/config/modules"

export const metadata: Metadata = { title: "Settings" }

const LOOKUP_SECTIONS: Array<{ kind: LookupKind; title: string; label: string; description: string; module?: ModuleKey }> = [
  { kind: "projectCategories", title: "Project categories", label: "Category", description: "Group projects, e.g. Client project, Internal, Retainer." },
  { kind: "projectStages", title: "Project stages", label: "Stage", description: "Where a project is in its life, e.g. In development, Live, Support." },
  { kind: "serviceCategories", title: "Service types", label: "Service type", description: "Types of recurring services you bill for.", module: "services" },
  { kind: "departments", title: "Departments", label: "Department", description: "Used on people profiles and as a filter." },
  { kind: "designations", title: "Designations", label: "Designation", description: "Job titles used on people profiles." },
]

async function Settings() {
  await requirePermission("settings:manage")
  const [general, moduleSettings, modules, lookups] = await Promise.all([getSettings("general"), getSettings("modules"), getModules(), listLookups()])
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Company</CardTitle>
        </CardHeader>
        <CardContent>
          <GeneralSettingsForm defaults={general} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Modules</CardTitle>
          <CardDescription>Turn on only what your business uses. Turned-off modules disappear from the app; their data is kept.</CardDescription>
        </CardHeader>
        <CardContent>
          <ModulesForm defaults={moduleSettings} />
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        {LOOKUP_SECTIONS.filter((section) => !section.module || modules[section.module]).map((section) => (
          <Card key={section.kind}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              <CardDescription>{section.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <LookupList kind={section.kind} label={section.label} items={lookups[section.kind]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function GeneralSettingsPage() {
  return (
    <PageHeader title="Settings" subtitle="Company details and lists used across the workspace." className="max-w-5xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Settings />
      </Suspense>
    </PageHeader>
  )
}
