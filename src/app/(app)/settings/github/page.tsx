import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { GithubPermissionForm, SyncRepositoriesButton } from "@/components/settings/github-settings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/format"
import { isGithubLoginConfigured } from "@/server/auth/auth"
import { requirePermission } from "@/server/auth/session"
import { githubOrg, isGithubAppConfigured } from "@/server/modules/github/client"
import { getRepositoryStats } from "@/server/modules/github/repositories"
import { getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "GitHub" }

function StatusRow({ label, ok, detail }: { label: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <span className={ok ? "text-sm text-emerald-600 dark:text-emerald-400" : "text-sm text-muted-foreground"}>
        {ok ? "Configured" : "Not configured"}
      </span>
    </div>
  )
}

async function GithubSettingsContent() {
  await requirePermission("github:manage")
  const [settings, repositoryStats] = await Promise.all([getSettings("github"), getRepositoryStats()])
  const appConfigured = isGithubAppConfigured()

  return (
    <div className="flex flex-col gap-6">
      {!appConfigured ? (
        <Alert>
          <AlertTitle>Connect a GitHub App</AlertTitle>
          <AlertDescription>
            Create a GitHub App for your organisation and set the GITHUB_APP_* variables. The setup guide is in docs/github.md.
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <StatusRow label="GitHub App" ok={appConfigured} detail={appConfigured ? `Organisation: ${githubOrg()}` : "Manages repository access."} />
          <StatusRow label="Account linking" ok={isGithubLoginConfigured} detail="Lets people connect their GitHub account from their profile." />
          <div className="flex flex-wrap items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">Repositories</p>
              <p className="text-sm text-muted-foreground">
                {repositoryStats.total} cached · last synced {formatDateTime(repositoryStats.lastSync)}
              </p>
            </div>
            {appConfigured ? <SyncRepositoriesButton /> : null}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Access by project role</CardTitle>
          <CardDescription>
            When someone is added to a project, they get this permission on every repository linked to it. If they are on several projects that share a
            repository, the strongest permission wins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GithubPermissionForm defaults={settings} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function GithubSettingsPage() {
  return (
    <PageHeader title="GitHub" subtitle="Organisation repositories and automatic access control." className="max-w-5xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <GithubSettingsContent />
      </Suspense>
    </PageHeader>
  )
}
