"use client"

import { type FormEvent, useState } from "react"
import { toast } from "sonner"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth-client"
import { passwordProblem } from "@/lib/password-policy"

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const newPassword = String(form.get("newPassword") ?? "")
    if (newPassword !== String(form.get("confirmPassword") ?? "")) return setError("The new passwords do not match.")
    const problem = passwordProblem(newPassword)
    if (problem) return setError(problem)

    setPending(true)
    setError(null)
    const { error: changeError } = await authClient.changePassword({
      currentPassword: String(form.get("currentPassword") ?? ""),
      newPassword,
      revokeOtherSessions: true,
    })
    setPending(false)
    if (changeError) return setError("Your current password is incorrect.")
    formElement.reset()
    toast.success("Password changed. Other devices have been signed out.")
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-3 sm:items-end">
      {error ? (
        <Alert variant="destructive" role="alert" className="sm:col-span-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormField id="currentPassword" label="Current password" required>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FormField>
      <FormField id="newPassword" label="New password" required>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password" required>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </FormField>
      <div className="flex justify-end sm:col-span-3">
        <SubmitButton pending={pending} pendingLabel="Saving…">
          Change password
        </SubmitButton>
      </div>
    </form>
  )
}
