import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { isSetupRequired } from "@/server/modules/setup/queries"
import { SetupForm } from "./setup-form"

export const metadata: Metadata = { title: "Set up" }

async function SetupGate() {
  if (!(await isSetupRequired())) redirect("/login")
  return <SetupForm />
}

export default function SetupPage() {
  return (
    <Card className="lg:bg-transparent lg:shadow-none lg:ring-0">
      <CardHeader>
        <CardTitle>Set up your workspace</CardTitle>
        <CardDescription>Create the first super admin account. This page is only available once.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-80 w-full" />}>
          <SetupGate />
        </Suspense>
      </CardContent>
    </Card>
  )
}
