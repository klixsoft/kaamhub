import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { RoleBadge } from "@/components/people/badges"
import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { GithubConnection } from "@/components/profile/github-connection"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { isGithubLoginConfigured } from "@/server/auth/auth"
import { requireUser } from "@/server/auth/session"
import { isModuleEnabled } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "My profile" }

async function Profile() {
  const [user, githubEnabled] = await Promise.all([requireUser(), isModuleEnabled("github")])
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
            <GithubConnection username={user.githubUsername} available={isGithubLoginConfigured} />
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
    </div>
  )
}

export default function ProfilePage() {
  return (
    <PageHeader title="My profile" className="max-w-4xl">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <Profile />
      </Suspense>
    </PageHeader>
  )
}
