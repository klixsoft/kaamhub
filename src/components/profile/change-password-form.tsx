"use client"

import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { changePassword } from "@/server/modules/auth/actions"

export function ChangePasswordForm() {
  const [state, submit] = useActionState(changePassword, null)
  const formRef = useRef<HTMLFormElement>(null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    formRef.current?.reset()
    toast.success("Password changed. Other devices have been signed out.")
  }, [state])

  return (
    <form ref={formRef} action={submit} className="grid gap-4 sm:grid-cols-3 sm:items-start">
      <div className="sm:col-span-3">
        <FormAlert state={state} />
      </div>
      <FormField id="currentPassword" label="Current password" required errors={errors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FormField>
      <FormField id="newPassword" label="New password" required errors={errors?.newPassword}>
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={10} required />
      </FormField>
      <FormField id="confirmPassword" label="Confirm new password" required errors={errors?.confirmPassword}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </FormField>
      <div className="flex justify-end sm:col-span-3">
        <SubmitButton pendingLabel="Saving…">Change password</SubmitButton>
      </div>
    </form>
  )
}
