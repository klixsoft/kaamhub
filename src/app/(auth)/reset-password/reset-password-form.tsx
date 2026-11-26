"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { resetPassword } from "@/server/modules/auth/actions"

export function ResetPasswordForm() {
  const token = useSearchParams().get("token")
  const [state, submit] = useActionState(resetPassword, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <Alert variant="destructive" role="alert">
          <AlertDescription>This link is invalid or has expired. Request a new one.</AlertDescription>
        </Alert>
        <Link href="/forgot-password" className="text-center text-sm underline-offset-4 hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <input type="hidden" name="token" value={token} />
      <FormField id="password" label="New password" required errors={errors?.password} description="At least 10 characters, with upper and lowercase letters and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" required errors={errors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </FormField>
      <SubmitButton pendingLabel="Saving…" className="w-full">
        Save password
      </SubmitButton>
    </form>
  )
}
