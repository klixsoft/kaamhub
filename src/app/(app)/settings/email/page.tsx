import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { EmailSettingsForm } from "@/components/settings/email-settings-form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { getEmailSettingsView } from "@/server/modules/integrations/config"

export const metadata: Metadata = { title: "Email" }

async function EmailSettingsContent() {
  const user = await requirePermission("system:update")
  const settings = await getEmailSettingsView()
  return <EmailSettingsForm defaults={settings} testRecipient={user.email} />
}

export default function EmailSettingsPage() {
  return (
    <PageHeader title="Email" subtitle="How KaamHub sends invitations, password resets, invoices and reminders." className="max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>SMTP server</CardTitle>
          <CardDescription>
            Use the SMTP details from your email provider. Until a server is saved, emails are not sent and are written to the server log instead.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <EmailSettingsContent />
          </Suspense>
        </CardContent>
      </Card>
    </PageHeader>
  )
}
