import type { Metadata } from "next"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ResetPasswordForm } from "./reset-password-form"

export const metadata: Metadata = { title: "Set password" }

export default function ResetPasswordPage() {
  return (
    <Card className="lg:bg-transparent lg:shadow-none lg:ring-0">
      <CardHeader>
        <CardTitle>Set your password</CardTitle>
        <CardDescription>Choose a password with at least 10 characters, including upper and lowercase letters and a number.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-40 w-full" />}>
          <ResetPasswordForm />
        </Suspense>
      </CardContent>
    </Card>
  )
}
