"use client"

import { useActionState } from "react"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { completeSetup } from "@/server/modules/setup/actions"

export function SetupForm() {
  const [state, formAction] = useActionState(completeSetup, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <FormField id="companyName" label="Company name" required errors={errors?.companyName}>
        <Input id="companyName" name="companyName" required autoFocus aria-invalid={Boolean(errors?.companyName) || undefined} />
      </FormField>
      <FormField id="name" label="Your full name" required errors={errors?.name}>
        <Input id="name" name="name" autoComplete="name" required aria-invalid={Boolean(errors?.name) || undefined} />
      </FormField>
      <FormField id="email" label="Email" required errors={errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={Boolean(errors?.email) || undefined} />
      </FormField>
      <FormField
        id="password"
        label="Password"
        required
        errors={errors?.password}
        description="At least 10 characters with upper and lowercase letters and a number."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-invalid={Boolean(errors?.password) || undefined}
        />
      </FormField>
      <SubmitButton pendingLabel="Creating workspace…" className="w-full">
        Create workspace
      </SubmitButton>
    </form>
  )
}
