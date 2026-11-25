"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/components/forms/date-picker"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ENVIRONMENT_KIND_LABELS } from "@/config/domain"
import { toOptions } from "@/lib/options"
import { createEnvironment, updateEnvironment } from "@/server/modules/environments/actions"
import type { EnvironmentRow } from "@/server/modules/environments/queries"

const kindOptions = toOptions(ENVIRONMENT_KIND_LABELS)

export function EnvironmentForm({ projectId, environment, onSaved }: { projectId: string; environment?: EnvironmentRow; onSaved: () => void }) {
  const [state, submit] = useActionState(environment ? updateEnvironment : createEnvironment, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success(environment ? "Environment updated" : "Environment added")
    onSaved()
  }, [state, environment, onSaved])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      {environment ? <input type="hidden" name="environmentId" value={environment.id} /> : null}
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="env-name" label="Name" required errors={errors?.name}>
        <Input id="env-name" name="name" defaultValue={environment?.name ?? "Production"} required />
      </FormField>
      <FormField id="env-kind" label="Type" required errors={errors?.kind}>
        <OptionCombobox
          id="env-kind"
          name="kind"
          required
          options={kindOptions}
          defaultValue={kindOptions.find((option) => option.value === (environment?.kind ?? "production")) ?? null}
        />
      </FormField>
      <FormField id="env-url" label="URL" errors={errors?.url} description="Checked hourly for uptime." className="sm:col-span-2">
        <Input id="env-url" name="url" type="url" placeholder="https://example.com" defaultValue={environment?.url ?? ""} />
      </FormField>
      <FormField id="env-branch" label="Branch" errors={errors?.branch} description="Deployed from, e.g. main">
        <Input id="env-branch" name="branch" className="font-mono" defaultValue={environment?.branch ?? ""} />
      </FormField>
      <FormField id="env-hosting" label="Hosting provider" errors={errors?.hostingProvider}>
        <Input id="env-hosting" name="hostingProvider" defaultValue={environment?.hostingProvider ?? ""} />
      </FormField>
      <FormField id="env-registrar" label="Domain registrar" errors={errors?.domainRegistrar}>
        <Input id="env-registrar" name="domainRegistrar" defaultValue={environment?.domainRegistrar ?? ""} />
      </FormField>
      <div className="hidden sm:block" />
      <FormField id="env-domain-expiry" label="Domain expires on" errors={errors?.domainExpiresOn}>
        <DatePicker id="env-domain-expiry" name="domainExpiresOn" defaultValue={environment?.domainExpiresOn} />
      </FormField>
      <FormField id="env-hosting-expiry" label="Hosting expires on" errors={errors?.hostingExpiresOn}>
        <DatePicker id="env-hosting-expiry" name="hostingExpiresOn" defaultValue={environment?.hostingExpiresOn} />
      </FormField>
      <FormField id="env-notes" label="Notes" errors={errors?.notes} className="sm:col-span-2">
        <Textarea id="env-notes" name="notes" rows={2} defaultValue={environment?.notes ?? ""} placeholder="Deployment notes, server details (no passwords)" />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{environment ? "Save environment" : "Add environment"}</SubmitButton>
      </div>
    </form>
  )
}
