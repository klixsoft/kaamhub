import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { SystemUpdate } from "@/components/settings/system-update"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { getVersionStatus } from "@/server/modules/system/releases"
import { getUpdaterStatus } from "@/server/modules/system/updater"

export const metadata: Metadata = { title: "System" }

async function SystemContent() {
  await requirePermission("system:update")
  const [version, updaterStatus] = await Promise.all([
    getVersionStatus(),
    getUpdaterStatus().catch((error: unknown) => {
      logger.warn("Updater status unavailable", { error })
      return null
    }),
  ])
  return <SystemUpdate version={version} updaterConfigured={updaterStatus !== null} initialStatus={updaterStatus} />
}

export default function SystemPage() {
  return (
    <PageHeader title="System" subtitle="Version information and updates." className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Updates</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            <SystemContent />
          </Suspense>
        </CardContent>
      </Card>
    </PageHeader>
  )
}
