"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PRIORITY_LABELS, REQUEST_TYPE_LABELS } from "@/config/domain"
import { toOptions } from "@/lib/options"
import { createClientRequest } from "@/server/modules/requests/actions"

const typeOptions = toOptions(REQUEST_TYPE_LABELS)
const urgencyOptions = toOptions(PRIORITY_LABELS)

export function RequestForm({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const [state, submit] = useActionState(createClientRequest, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success("Request sent to the project team")
    onSaved()
  }, [state, onSaved])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <FormField id="request-title" label="Summary" required errors={errors?.title} className="sm:col-span-2">
        <Input id="request-title" name="title" placeholder="e.g. The contact form does not send on mobile" required />
      </FormField>
      <FormField id="request-type" label="What kind of request is it?" required errors={errors?.type}>
        <OptionCombobox id="request-type" name="type" required options={typeOptions} defaultValue={typeOptions.find((option) => option.value === "bug") ?? null} />
      </FormField>
      <FormField id="request-priority" label="How urgent is it?" required errors={errors?.priority}>
        <OptionCombobox id="request-priority" name="priority" required options={urgencyOptions} defaultValue={urgencyOptions.find((option) => option.value === "medium") ?? null} />
      </FormField>
      <FormField
        id="request-description"
        label="Details"
        required
        errors={errors?.description}
        description="What happened, what you expected, and where (links, device, browser). You can attach screenshots on the card once it is created."
        className="sm:col-span-2"
      >
        <Textarea id="request-description" name="description" rows={6} required />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
      </div>
    </form>
  )
}
