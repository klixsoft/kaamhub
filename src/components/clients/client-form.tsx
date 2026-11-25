"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/config/domain"
import { toOptions } from "@/lib/options"
import { createClient, updateClient } from "@/server/modules/clients/actions"
import type { ClientInput } from "@/server/modules/clients/schema"

const statusOptions = toOptions(CLIENT_STATUS_LABELS)

interface ClientFormProps {
  defaults?: ClientInput & { id: string }
  onSaved?: () => void
}

export function ClientForm({ defaults, onSaved }: ClientFormProps) {
  const router = useRouter()
  const [state, submit] = useActionState(defaults ? updateClient : createClient, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const invalid = (field: string) => Boolean(errors?.[field]) || undefined
  const status: ClientStatus = defaults?.status ?? "active"

  useEffect(() => {
    if (!state?.ok) return
    toast.success(defaults ? "Client updated" : "Client added")
    onSaved?.()
    if (!defaults) router.push(`/clients/${state.data.id}`)
  }, [state, defaults, onSaved, router])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      {defaults ? <input type="hidden" name="clientId" value={defaults.id} /> : null}
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="client-name" label="Name" required errors={errors?.name} className="sm:col-span-2">
        <Input id="client-name" name="name" defaultValue={defaults?.name} required aria-invalid={invalid("name")} />
      </FormField>
      <FormField id="client-email" label="Email" errors={errors?.email}>
        <Input id="client-email" name="email" type="email" defaultValue={defaults?.email ?? ""} aria-invalid={invalid("email")} />
      </FormField>
      <FormField id="client-phone" label="Phone" errors={errors?.phone}>
        <Input id="client-phone" name="phone" type="tel" defaultValue={defaults?.phone ?? ""} />
      </FormField>
      <FormField id="client-website" label="Website" errors={errors?.website}>
        <Input id="client-website" name="website" type="url" placeholder="https://" defaultValue={defaults?.website ?? ""} aria-invalid={invalid("website")} />
      </FormField>
      <FormField id="client-tax" label="PAN / VAT number" errors={errors?.taxNumber}>
        <Input id="client-tax" name="taxNumber" defaultValue={defaults?.taxNumber ?? ""} />
      </FormField>
      <FormField id="client-status" label="Status" required errors={errors?.status}>
        <OptionCombobox
          id="client-status"
          name="status"
          required
          options={statusOptions}
          defaultValue={statusOptions.find((option) => option.value === status) ?? null}
        />
      </FormField>
      <FormField id="client-address" label="Address" errors={errors?.address} className="sm:col-span-2">
        <Textarea id="client-address" name="address" rows={2} defaultValue={defaults?.address ?? ""} />
      </FormField>
      <FormField id="client-notes" label="Internal notes" errors={errors?.notes} className="sm:col-span-2">
        <Textarea id="client-notes" name="notes" rows={3} defaultValue={defaults?.notes ?? ""} />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{defaults ? "Save changes" : "Add client"}</SubmitButton>
      </div>
    </form>
  )
}
