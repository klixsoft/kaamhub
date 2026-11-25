"use client"

import Link from "next/link"
import { type FormEvent, useState } from "react"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"

export function ForgotPasswordForm() {
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "limited">("idle")

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus("pending")
    const email = String(new FormData(event.currentTarget).get("email") ?? "")
    const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" })
    setStatus(error?.status === 429 ? "limited" : "sent")
  }

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-4">
        <Alert role="status">
          <AlertDescription>If an account exists for that email, a reset link is on its way. Check your inbox.</AlertDescription>
        </Alert>
        <Link href="/login" className="text-center text-sm underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {status === "limited" ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>Too many requests. Please wait a minute and try again.</AlertDescription>
        </Alert>
      ) : null}
      <FormField id="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </FormField>
      <SubmitButton pending={status === "pending"} pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
      <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  )
}
