"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { type FormEvent, useState } from "react"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { safeRedirectPath } from "@/lib/safe-redirect"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    const { error: signInError } = await authClient.signIn.email({
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
    })
    if (signInError) {
      setPending(false)
      setError(
        signInError.status === 429
          ? "Too many attempts. Please wait a minute and try again."
          : "The email or password is incorrect, or your account is not active.",
      )
      return
    }
    router.replace(safeRedirectPath(searchParams.get("next"), "/"))
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormField id="email" label="Email" required>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </FormField>
      <FormField id="password" label="Password" required>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      <SubmitButton pending={pending} pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
      <Link href="/forgot-password" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
        Forgot your password?
      </Link>
    </form>
  )
}
