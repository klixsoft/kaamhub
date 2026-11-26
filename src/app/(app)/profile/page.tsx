import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { RoleBadge } from "@/components/people/badges"
import { ActiveSessions } from "@/components/profile/active-sessions"
import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { GithubConnection } from "@/components/profile/github-connection"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentSession } from "@/server/auth/session"
import { listActiveSessions } from "@/server/auth/session-store"
import { getGithubOAuthConfig } from "@/server/modules/integrations/config"
import { isModuleEnabled } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "My profile" }

async function Profile({ searchParams }: { searchParams: PageProps<"/profile">["searchParams"] }) {
  const session = await getCurrentSession()
  if (!session) redirect("/login")
  const { user, sessionId } = session
  const [githubEnabled, githubOAuth, sessions, query] = await Promise.all([
    isModuleEnabled("github"),
    getGithubOAuthConfig(),
    listActiveSessions(user.id),
    searchParams,
  ])
  const githubResult = typeof query.github === "string" ? query.github : null
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{user.name}</CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            {user.email}
            <RoleBadge role={user.role} />
          </CardDescription>
        </CardHeader>
      </Card>
      {githubEnabled && user.role !== "client" ? (
        <Card>
          <CardHeader>
            <CardTitle>GitHub</CardTitle>
          </CardHeader>
          <CardContent>
            <GithubConnection username={user.githubUsername} available={githubOAuth !== null} result={githubResult} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices signed in to your account. Sign out of any you don’t recognise.</CardDescription>
        </CardHeader>
        <CardContent>
          <ActiveSessions sessions={sessions} currentSessionId={sessionId} />
        </CardContent>
      </Card>
    </div>
  )
}

export default function ProfilePage({ searchParams }: PageProps<"/profile">) {
  return (
    <PageHeader title="My profile" className="max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Profile searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
