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
import { BILLING_CYCLE_LABELS, SERVICE_STATUS_LABELS, SERVICE_TYPE_LABELS, type TaxConfig, taxTreatmentOptions } from "@/config/finance"
import { type Option, toOptions } from "@/lib/options"
import type { ServiceRow } from "@/server/modules/services/queries"
import { createService, updateService } from "@/server/modules/services/actions"

const typeOptions = toOptions(SERVICE_TYPE_LABELS)
const cycleOptions = toOptions(BILLING_CYCLE_LABELS)
const statusOptions = toOptions(SERVICE_STATUS_LABELS)
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null

interface ServiceFormProps {
  projectId: string
  service?: ServiceRow
  currencySymbol: string
  tax: TaxConfig
  today: string
  onSaved: () => void
}

export function ServiceForm({ projectId, service, currencySymbol, tax, today, onSaved }: ServiceFormProps) {
  const treatmentOptions = taxTreatmentOptions(tax)
  const [state, submit] = useActionState(service ? updateService : createService, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success(service ? "Service updated" : "Service added")
    onSaved()
  }, [state, service, onSaved])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      {service ? <input type="hidden" name="serviceId" value={service.id} /> : null}
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="service-type" label="Type" required errors={errors?.type}>
        <OptionCombobox id="service-type" name="type" required options={typeOptions} defaultValue={pick(typeOptions, service?.type ?? "domain")} />
      </FormField>
      <FormField id="service-name" label="Name" required errors={errors?.name} description="e.g. example.com.np or Business hosting">
        <Input id="service-name" name="name" defaultValue={service?.name} required />
      </FormField>
      <FormField id="service-provider" label="Provider" errors={errors?.provider}>
        <Input id="service-provider" name="provider" defaultValue={service?.provider ?? ""} placeholder="Registrar or hosting company" />
      </FormField>
      <FormField id="service-expires" label="Expires on" errors={errors?.expiresOn} description="When it must be renewed with the provider.">
        <DatePicker id="service-expires" name="expiresOn" defaultValue={service?.expiresOn} />
      </FormField>
      <FormField id="service-amount" label={`Amount (${currencySymbol})`} required errors={errors?.amount}>
        <Input id="service-amount" name="amount" type="number" min={0} step="any" defaultValue={service?.amount} required />
      </FormField>
      <FormField id="service-cycle" label="Billing cycle" required errors={errors?.billingCycle}>
        <OptionCombobox id="service-cycle" name="billingCycle" required options={cycleOptions} defaultValue={pick(cycleOptions, service?.billingCycle ?? "yearly")} />
      </FormField>
      <FormField id="service-next" label="Next billing date" required errors={errors?.nextBillingOn} description="A draft invoice is prepared before this date.">
        <DatePicker id="service-next" name="nextBillingOn" defaultValue={service?.nextBillingOn ?? today} required />
      </FormField>
      <FormField id="service-tax" label="Tax" required errors={errors?.taxTreatment}>
        <OptionCombobox
          id="service-tax"
          name="taxTreatment"
          required
          options={treatmentOptions}
          defaultValue={pick(treatmentOptions, service?.taxTreatment ?? (tax.enabled ? "standard" : "exempt"))}
        />
      </FormField>
      <FormField id="service-started" label="Started on" errors={errors?.startedOn}>
        <DatePicker id="service-started" name="startedOn" defaultValue={service?.startedOn} />
      </FormField>
      <FormField id="service-status" label="Status" required errors={errors?.status}>
        <OptionCombobox id="service-status" name="status" required options={statusOptions} defaultValue={pick(statusOptions, service?.status ?? "active")} />
      </FormField>
      <FormField id="service-notes" label="Notes" errors={errors?.notes} className="sm:col-span-2">
        <Textarea id="service-notes" name="notes" rows={2} defaultValue={service?.notes ?? ""} />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{service ? "Save service" : "Add service"}</SubmitButton>
      </div>
    </form>
  )
}
