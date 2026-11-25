"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { BILLING_PRESETS, type BillingPreset } from "@/config/billing-presets"
import { CALENDAR_LABELS, MONTH_LABELS, NUMBERING_SYSTEM_LABELS } from "@/config/finance"
import { amountInWords, formatMoney } from "@/lib/money"
import { type Option, toOptions } from "@/lib/options"
import { saveBillingSettings } from "@/server/modules/settings/actions"
import type { BillingSettings } from "@/server/modules/settings/schema"

const numberingOptions = toOptions(NUMBERING_SYSTEM_LABELS)
const calendarOptions = toOptions(CALENDAR_LABELS)
const monthOptions: Option[] = MONTH_LABELS.map((label, index) => ({ value: String(index + 1), label }))
const presetOptions: Option[] = BILLING_PRESETS.map((preset) => ({ value: preset.id, label: preset.label }))
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null

type LocalisedValues = BillingPreset["values"]

function ToggleField({ id, name, checked, onChange, title, description }: {
  id: string
  name: string
  checked: boolean
  onChange: (value: boolean) => void
  title: string
  description: string
}) {
  return (
    <label htmlFor={id} className="flex items-start gap-3 text-sm">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <input type="hidden" name={name} value={String(checked)} />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground">{description}</span>
      </span>
    </label>
  )
}

function LocalisationFields({ values, errors }: { values: LocalisedValues; errors?: Partial<Record<string, string[]>> }) {
  const [chargesTax, setChargesTax] = useState(values.chargesTax)
  const [showWords, setShowWords] = useState(values.showAmountInWords)
  const [currency, setCurrency] = useState({
    code: values.currencyCode,
    symbol: values.currencySymbol,
    majorName: values.currencyMajorName,
    minorName: values.currencyMinorName,
    numbering: values.currencyNumbering,
  })
  const sample = 125430.5

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tax</CardTitle>
          <CardDescription>Use the name, rate and number label that apply where your company is registered.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <ToggleField
              id="chargesTax"
              name="chargesTax"
              checked={chargesTax}
              onChange={setChargesTax}
              title="We charge tax on invoices"
              description="Turn off if your company is not registered for VAT, GST or sales tax."
            />
          </div>
          <FormField id="taxName" label="Tax name" required errors={errors?.taxName} description="e.g. VAT, GST, Sales tax">
            <Input id="taxName" name="taxName" defaultValue={values.taxName} required />
          </FormField>
          <FormField id="taxRate" label="Standard rate (%)" required errors={errors?.taxRate}>
            <Input id="taxRate" name="taxRate" type="number" min={0} max={100} step="any" defaultValue={values.taxRate} required disabled={!chargesTax} />
          </FormField>
          {chargesTax ? null : <input type="hidden" name="taxRate" value={values.taxRate} />}
          <FormField id="taxIdLabel" label="Tax number label" required errors={errors?.taxIdLabel} description="e.g. VAT No., GSTIN, ABN, Tax ID">
            <Input id="taxIdLabel" name="taxIdLabel" defaultValue={values.taxIdLabel} required />
          </FormField>
          <FormField id="taxInvoiceTitle" label="Document title" required errors={errors?.taxInvoiceTitle} description="Used when tax is charged; otherwise “Invoice”.">
            <Input id="taxInvoiceTitle" name="taxInvoiceTitle" defaultValue={values.taxInvoiceTitle} required />
          </FormField>
          <FormField id="calendar" label="Calendar" required errors={errors?.calendar}>
            <OptionCombobox id="calendar" name="calendar" required options={calendarOptions} defaultValue={pick(calendarOptions, values.calendar)} />
          </FormField>
          <FormField id="fiscalYearStartMonth" label="Fiscal year starts in" required errors={errors?.fiscalYearStartMonth} description="Invoice numbers restart each fiscal year.">
            <OptionCombobox
              id="fiscalYearStartMonth"
              name="fiscalYearStartMonth"
              required
              options={monthOptions}
              defaultValue={pick(monthOptions, String(values.fiscalYearStartMonth))}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            Used for every invoice and service. Example: {formatMoney(sample, currency)}
            {showWords ? ` — ${amountInWords(sample, currency)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="currencyCode" label="Currency code" required errors={errors?.currencyCode}>
            <Input
              id="currencyCode"
              name="currencyCode"
              defaultValue={values.currencyCode}
              maxLength={3}
              className="font-mono uppercase"
              required
              onChange={(event) => setCurrency((current) => ({ ...current, code: event.target.value }))}
            />
          </FormField>
          <FormField id="currencySymbol" label="Symbol" required errors={errors?.currencySymbol}>
            <Input
              id="currencySymbol"
              name="currencySymbol"
              defaultValue={values.currencySymbol}
              maxLength={6}
              required
              onChange={(event) => setCurrency((current) => ({ ...current, symbol: event.target.value }))}
            />
          </FormField>
          <FormField id="currencyNumbering" label="Number format" required errors={errors?.currencyNumbering}>
            <OptionCombobox
              id="currencyNumbering"
              name="currencyNumbering"
              required
              options={numberingOptions}
              defaultValue={pick(numberingOptions, values.currencyNumbering)}
              onChange={(option) => option && setCurrency((current) => ({ ...current, numbering: option.value as LocalisedValues["currencyNumbering"] }))}
            />
          </FormField>
          <FormField id="currencyMajorName" label="Name in words" required errors={errors?.currencyMajorName} description="e.g. Dollars, Euros, Rupees">
            <Input
              id="currencyMajorName"
              name="currencyMajorName"
              defaultValue={values.currencyMajorName}
              required
              onChange={(event) => setCurrency((current) => ({ ...current, majorName: event.target.value }))}
            />
          </FormField>
          <FormField id="currencyMinorName" label="Fraction name" errors={errors?.currencyMinorName} description="e.g. Cents, Paisa">
            <Input
              id="currencyMinorName"
              name="currencyMinorName"
              defaultValue={values.currencyMinorName}
              onChange={(event) => setCurrency((current) => ({ ...current, minorName: event.target.value }))}
            />
          </FormField>
          <div className="sm:col-span-2 lg:col-span-3">
            <ToggleField
              id="showAmountInWords"
              name="showAmountInWords"
              checked={showWords}
              onChange={setShowWords}
              title="Print the total in words"
              description="Common or required in South Asia; usually off elsewhere."
            />
          </div>
        </CardContent>
      </Card>
    </>
  )
}

export function BillingSettingsForm({ defaults }: { defaults: BillingSettings }) {
  const [state, submit] = useActionState(saveBillingSettings, null)
  const [localised, setLocalised] = useState<LocalisedValues>(defaults)
  const [presetVersion, setPresetVersion] = useState(0)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const invalid = (field: string) => Boolean(errors?.[field]) || undefined

  useEffect(() => {
    if (state?.ok) toast.success("Billing settings saved")
  }, [state])

  function applyPreset(option: Option | null) {
    const preset = BILLING_PRESETS.find((candidate) => candidate.id === option?.value)
    if (!preset) return
    setLocalised(preset.values)
    setPresetVersion((version) => version + 1)
    toast.info(`${preset.label} applied. Review the values, then save.`)
  }

  return (
    <form action={submit} className="flex flex-col gap-6">
      <FormAlert state={state} />
      <Card>
        <CardHeader>
          <CardTitle>Start from a country preset</CardTitle>
          <CardDescription>Fills in tax, calendar and currency. Every value can be changed, and should be confirmed with your accountant.</CardDescription>
        </CardHeader>
        <CardContent>
          <OptionCombobox id="preset" options={presetOptions} value={null} onChange={applyPreset} placeholder="Choose a preset…" className="w-full sm:w-96" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Printed on every invoice. Issued invoices keep the details they were issued with.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="legalName" label="Registered company name" required errors={errors?.legalName}>
            <Input id="legalName" name="legalName" defaultValue={defaults.legalName} required aria-invalid={invalid("legalName")} />
          </FormField>
          <FormField id="taxNumber" label="Tax registration number" errors={errors?.taxNumber}>
            <Input id="taxNumber" name="taxNumber" defaultValue={defaults.taxNumber} aria-invalid={invalid("taxNumber")} />
          </FormField>
          <FormField id="billingEmail" label="Billing email" errors={errors?.email}>
            <Input id="billingEmail" name="email" type="email" defaultValue={defaults.email} aria-invalid={invalid("email")} />
          </FormField>
          <FormField id="billingPhone" label="Phone" errors={errors?.phone}>
            <Input id="billingPhone" name="phone" type="tel" defaultValue={defaults.phone} />
          </FormField>
          <FormField id="billingWebsite" label="Website" errors={errors?.website}>
            <Input id="billingWebsite" name="website" defaultValue={defaults.website} />
          </FormField>
          <FormField id="billingAddress" label="Address" errors={errors?.address}>
            <Textarea id="billingAddress" name="address" rows={2} defaultValue={defaults.address} />
          </FormField>
        </CardContent>
      </Card>

      <LocalisationFields key={presetVersion} values={localised} errors={errors} />

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="invoicePrefix" label="Number prefix" errors={errors?.invoicePrefix} description="Numbers look like INV-2026-0001.">
            <Input id="invoicePrefix" name="invoicePrefix" defaultValue={defaults.invoicePrefix} maxLength={10} className="font-mono" />
          </FormField>
          <FormField id="paymentTermsDays" label="Payment terms (days)" required errors={errors?.paymentTermsDays}>
            <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={180} defaultValue={defaults.paymentTermsDays} required />
          </FormField>
          <FormField id="recurringLeadDays" label="Create recurring drafts (days before due)" required errors={errors?.recurringLeadDays}>
            <Input id="recurringLeadDays" name="recurringLeadDays" type="number" min={0} max={60} defaultValue={defaults.recurringLeadDays} required />
          </FormField>
          <div className="hidden sm:block" />
          <FormField id="bankDetails" label="Payment details" errors={errors?.bankDetails} description="Bank account, payment link or wallet details printed on invoices.">
            <Textarea id="bankDetails" name="bankDetails" rows={4} defaultValue={defaults.bankDetails} />
          </FormField>
          <FormField id="invoiceFooter" label="Invoice footer" errors={errors?.invoiceFooter}>
            <Textarea id="invoiceFooter" name="invoiceFooter" rows={4} defaultValue={defaults.invoiceFooter} />
          </FormField>
        </CardContent>
        <CardFooter className="justify-end">
          <SubmitButton pendingLabel="Saving…">Save billing settings</SubmitButton>
        </CardFooter>
      </Card>
    </form>
  )
}
