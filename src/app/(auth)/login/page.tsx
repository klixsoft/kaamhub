import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { isSetupRequired } from "@/server/modules/setup/queries"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign in" }

async function LoginGate() {
  if (await isSetupRequired()) redirect("/setup")
  return <LoginForm />
}

export default function LoginPage() {
  return (
    <Card className="lg:bg-transparent lg:shadow-none lg:ring-0">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use the email address your administrator invited.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-56 w-full" />}>
          <LoginGate />
        </Suspense>
      </CardContent>
    </Card>
  )
}
