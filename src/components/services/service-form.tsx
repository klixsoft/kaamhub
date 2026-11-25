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
import { BILLING_CYCLE_LABELS, SERVICE_STATUS_LABELS } from "@/config/finance"
import { type Option, toOptions } from "@/lib/options"
import type { ServiceRow } from "@/server/modules/services/queries"

import { createService, updateService } from "@/server/modules/services/actions"

const cycleOptions = toOptions(BILLING_CYCLE_LABELS)
const statusOptions = toOptions(SERVICE_STATUS_LABELS)
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null

interface ServiceFormProps {
  project?: Option | null
  service?: ServiceRow
  currencySymbol: string
  today: string
  onSaved: () => void
}

export function ServiceForm({ project, service, currencySymbol, today, onSaved }: ServiceFormProps) {
  const [state, submit] = useActionState(service ? updateService : createService, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success(service ? "Service updated" : "Service added")
    onSaved()
  }, [state, service, onSaved])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      {service ? <input type="hidden" name="serviceId" value={service.id} /> : null}
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="service-project" label="Project" required errors={errors?.projectId} description="The project's client is billed." className="sm:col-span-2">
        <OptionCombobox id="service-project" name="projectId" resource="projects" defaultValue={project} placeholder="Search projects…" />
      </FormField>
      <FormField id="service-category" label="Type" errors={errors?.categoryId} description="Managed in Settings.">
        <OptionCombobox
          id="service-category"
          name="categoryId"
          resource="service-categories"
          defaultValue={service?.categoryId && service.categoryName ? { value: service.categoryId, label: service.categoryName } : null}
          placeholder="Subscription, retainer…"
        />
      </FormField>
      <FormField id="service-name" label="Name" required errors={errors?.name} description="e.g. Monthly retainer, Support plan, example.com">
        <Input id="service-name" name="name" defaultValue={service?.name} required />
      </FormField>
      <FormField id="service-provider" label="Provider" errors={errors?.provider}>
        <Input id="service-provider" name="provider" defaultValue={service?.provider ?? ""} placeholder="Supplier, if any" />
      </FormField>
      <FormField id="service-expires" label="Expires on" errors={errors?.expiresOn} description="When it must be renewed with the supplier.">
        <DatePicker id="service-expires" name="expiresOn" defaultValue={service?.expiresOn} />
      </FormField>
      <FormField id="service-amount" label={`Amount (${currencySymbol})`} required errors={errors?.amount} description="Before tax. Add any taxes on the draft invoice.">
        <Input id="service-amount" name="amount" type="number" min={0} step="any" defaultValue={service?.amount} required />
      </FormField>
      <FormField id="service-cycle" label="Billing cycle" required errors={errors?.billingCycle}>
        <OptionCombobox id="service-cycle" name="billingCycle" required options={cycleOptions} defaultValue={pick(cycleOptions, service?.billingCycle ?? "yearly")} />
      </FormField>
      <FormField id="service-next" label="Next billing date" required errors={errors?.nextBillingOn} description="A draft invoice is prepared before this date.">
        <DatePicker id="service-next" name="nextBillingOn" defaultValue={service?.nextBillingOn ?? today} required />
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
