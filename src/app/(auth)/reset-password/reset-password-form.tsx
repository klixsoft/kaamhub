"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useState } from "react"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { passwordProblem } from "@/lib/password-policy"

export function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get("token")
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get("password") ?? "")
    if (password !== String(form.get("confirmPassword") ?? "")) return setError("The passwords do not match.")
    const problem = passwordProblem(password)
    if (problem) return setError(problem)

    setPending(true)
    setError(null)
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token: token as string })
    if (resetError) {
      setPending(false)
      setError("This link is invalid or has expired. Request a new one.")
      return
    }
    router.replace("/login")
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormField id="password" label="New password" required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </FormField>
      <FormField id="confirmPassword" label="Confirm password" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </FormField>
      <SubmitButton pending={pending} pendingLabel="Saving…" className="w-full">
        Save password
      </SubmitButton>
    </form>
  )
}
