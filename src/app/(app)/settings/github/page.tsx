import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { GithubAppForm } from "@/components/settings/github-app-form"
import { GithubPermissionForm, SyncRepositoriesButton } from "@/components/settings/github-settings"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDateTime } from "@/lib/format"
import { env } from "@/config/env"
import { can, requirePermission } from "@/server/auth/session"
import { githubCallbackUrl } from "@/server/modules/github/oauth"
import { getGithubAppConfig, getGithubAppSettingsView, getGithubOAuthConfig } from "@/server/modules/integrations/config"
import { getRepositoryStats } from "@/server/modules/github/repositories"
import { getSettings } from "@/server/modules/settings/queries"
import { requireModule } from "@/server/modules/settings/guards"

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
  const user = await requirePermission("github:manage")
  await requireModule("github")
  const canConfigure = can(user, "system:update")
  const [settings, repositoryStats, appConfig, oauthConfig, appSettings] = await Promise.all([
    getSettings("github"),
    getRepositoryStats(),
    getGithubAppConfig(),
    getGithubOAuthConfig(),
    canConfigure ? getGithubAppSettingsView() : null,
  ])
  const appConfigured = appConfig !== null

  return (
    <div className="flex flex-col gap-6">
      {!appConfigured ? (
        <Alert>
          <AlertTitle>Connect a GitHub App</AlertTitle>
          <AlertDescription>
            {canConfigure
              ? "Create a GitHub App for your organisation and enter its details under GitHub App below. The setup guide is in docs/github.md."
              : "A Super Admin needs to connect a GitHub App for your organisation."}
          </AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Connection</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <StatusRow label="GitHub App" ok={appConfigured} detail={appConfig ? `Organisation: ${appConfig.org}` : "Manages repository access."} />
          <StatusRow label="Account linking" ok={oauthConfig !== null} detail="Lets people connect their GitHub account from their profile." />
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
      {appSettings ? (
        <Card>
          <CardHeader>
            <CardTitle>GitHub App</CardTitle>
            <CardDescription>Only Super Admins can see and change these details. Secrets are encrypted before they are stored.</CardDescription>
          </CardHeader>
          <CardContent>
            <GithubAppForm defaults={appSettings} callbackUrl={githubCallbackUrl()} webhookUrl={`${env.APP_URL}/api/github/webhook`} />
          </CardContent>
        </Card>
      ) : null}
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
