import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { LetterSettingsForm } from "@/components/letters/letter-settings-form"
import { LettersNav } from "@/components/letters/letters-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { requirePermission } from "@/server/auth/session"
import { getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Letterhead" }

async function Settings() {
  await requirePermission("letters:manage")
  return <LetterSettingsForm defaults={await getSettings("letters")} />
}

export default function LetterSettingsPage() {
  return (
    <PageHeader title="Letterhead" subtitle="The page every letter is printed on, its margins, numbering and signatory." actions={<LettersNav current="/letters/settings" />} className="max-w-4xl">
      <Card>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96 w-full" />}>
            <Settings />
          </Suspense>
        </CardContent>
      </Card>
    </PageHeader>
  )
}
