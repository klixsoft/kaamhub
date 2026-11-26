"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useActionState } from "react"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { signIn } from "@/server/modules/auth/actions"

export function LoginForm() {
  const searchParams = useSearchParams()
  const [state, submit] = useActionState(signIn, null)

  return (
    <form action={submit} className="flex flex-col gap-4">
      {searchParams.get("reset") ? (
        <Alert role="status">
          <AlertDescription>Your password has been saved. Sign in with your new password.</AlertDescription>
        </Alert>
      ) : null}
      <FormAlert state={state} />
      <input type="hidden" name="next" value={searchParams.get("next") ?? ""} />
      <FormField id="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </FormField>
      <FormField id="password" label="Password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
      <Link href="/forgot-password" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Forgot your password?
      </Link>
    </form>
  )
}
