import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { GeneralSettingsForm } from "@/components/settings/general-settings-form"
import { LookupList } from "@/components/settings/lookup-list"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { getSettings, listLookups } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Settings" }

async function Settings() {
  await requirePermission("settings:manage")
  const [general, lookups] = await Promise.all([getSettings("general"), listLookups()])
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
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
            <CardDescription>Used on people profiles and as a filter.</CardDescription>
          </CardHeader>
          <CardContent>
            <LookupList kind="departments" label="Department" items={lookups.departments} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Designations</CardTitle>
            <CardDescription>Job titles such as Senior Developer or UI Designer.</CardDescription>
          </CardHeader>
          <CardContent>
            <LookupList kind="designations" label="Designation" items={lookups.designations} />
          </CardContent>
        </Card>
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
