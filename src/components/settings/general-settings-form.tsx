"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { saveGeneralSettings } from "@/server/modules/settings/actions"
import type { GeneralSettings } from "@/server/modules/settings/schema"

export function GeneralSettingsForm({ defaults }: { defaults: GeneralSettings }) {
  const [state, submit] = useActionState(saveGeneralSettings, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (state?.ok) toast.success("Settings saved")
  }, [state])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="companyName" label="Company name" required errors={errors?.companyName}>
        <Input id="companyName" name="companyName" defaultValue={defaults.companyName} required />
      </FormField>
      <FormField
        id="projectCodePrefix"
        label="Project code prefix"
        errors={errors?.projectCodePrefix}
        description="Pre-filled when creating a project, e.g. ACME."
      >
        <Input id="projectCodePrefix" name="projectCodePrefix" defaultValue={defaults.projectCodePrefix} maxLength={6} className="font-mono uppercase" />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">Save</SubmitButton>
      </div>
    </form>
  )
}
