"use client"

import Link from "next/link"
import { useActionState } from "react"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { requestPasswordReset } from "@/server/modules/auth/actions"

export function ForgotPasswordForm() {
  const [state, submit] = useActionState(requestPasswordReset, null)

  if (state?.ok && state.data === "sent") {
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
    <form action={submit} className="flex flex-col gap-4">
      {state?.ok && state.data === "limited" ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>Too many requests. Please wait a minute and try again.</AlertDescription>
        </Alert>
      ) : null}
      <FormAlert state={state} />
      <FormField id="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </FormField>
      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
      <Link href="/login" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Back to sign in
      </Link>
    </form>
  )
}
