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
import { CALENDAR_LABELS, type CurrencyFormat, MONTH_LABELS, NUMBERING_SYSTEM_LABELS, type NumberingSystem } from "@/config/finance"
import { amountInWords, formatMoney } from "@/lib/money"
import { type Option, toOptions } from "@/lib/options"
import { saveBillingSettings } from "@/server/modules/settings/actions"
import type { BillingSettings } from "@/server/modules/settings/schema"

const numberingOptions = toOptions(NUMBERING_SYSTEM_LABELS)
const calendarOptions = toOptions(CALENDAR_LABELS)
const monthOptions: Option[] = MONTH_LABELS.map((label, index) => ({ value: String(index + 1), label }))
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null
const SAMPLE_AMOUNT = 125430.5

export function BillingSettingsForm({ defaults }: { defaults: BillingSettings }) {
  const [state, submit] = useActionState(saveBillingSettings, null)
  const [showWords, setShowWords] = useState(defaults.showAmountInWords)
  const [currency, setCurrency] = useState<CurrencyFormat>({
    code: defaults.currencyCode,
    symbol: defaults.currencySymbol,
    majorName: defaults.currencyMajorName,
    minorName: defaults.currencyMinorName,
    numbering: defaults.currencyNumbering,
  })
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const invalid = (field: string) => Boolean(errors?.[field]) || undefined
  const setCurrencyField = (field: keyof CurrencyFormat) => (value: string) => setCurrency((current) => ({ ...current, [field]: value }))

  useEffect(() => {
    if (state?.ok) toast.success("Billing settings saved")
  }, [state])

  return (
    <form action={submit} className="flex flex-col gap-6">
      <FormAlert state={state} />
      <Card>
        <CardHeader>
          <CardTitle>Company details</CardTitle>
          <CardDescription>Printed as the seller on every invoice. Issued invoices keep the details they were issued with.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="legalName" label="Registered company name" required errors={errors?.legalName}>
            <Input id="legalName" name="legalName" defaultValue={defaults.legalName} required aria-invalid={invalid("legalName")} />
          </FormField>
          <FormField id="billingEmail" label="Billing email" errors={errors?.email}>
            <Input id="billingEmail" name="email" type="email" defaultValue={defaults.email} aria-invalid={invalid("email")} />
          </FormField>
          <FormField id="taxIdLabel" label="Tax number label" required errors={errors?.taxIdLabel} description="e.g. Tax ID, VAT No., GSTIN, PAN">
            <Input id="taxIdLabel" name="taxIdLabel" defaultValue={defaults.taxIdLabel} required />
          </FormField>
          <FormField id="taxNumber" label="Your tax number" errors={errors?.taxNumber}>
            <Input id="taxNumber" name="taxNumber" defaultValue={defaults.taxNumber} />
          </FormField>
          <FormField id="billingPhone" label="Phone" errors={errors?.phone}>
            <Input id="billingPhone" name="phone" type="tel" defaultValue={defaults.phone} />
          </FormField>
          <FormField id="billingWebsite" label="Website" errors={errors?.website}>
            <Input id="billingWebsite" name="website" defaultValue={defaults.website} />
          </FormField>
          <FormField id="billingAddress" label="Address" errors={errors?.address} className="sm:col-span-2">
            <Textarea id="billingAddress" name="address" rows={2} defaultValue={defaults.address} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            Used for every invoice and service. Example: {formatMoney(SAMPLE_AMOUNT, currency)}
            {showWords ? ` — ${amountInWords(SAMPLE_AMOUNT, currency)}` : ""}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="currencyCode" label="Currency code" required errors={errors?.currencyCode} description="ISO code, e.g. USD, EUR, INR">
            <Input
              id="currencyCode"
              name="currencyCode"
              defaultValue={defaults.currencyCode}
              maxLength={3}
              className="font-mono uppercase"
              required
              onChange={(event) => setCurrencyField("code")(event.target.value)}
            />
          </FormField>
          <FormField id="currencySymbol" label="Symbol" required errors={errors?.currencySymbol}>
            <Input id="currencySymbol" name="currencySymbol" defaultValue={defaults.currencySymbol} maxLength={6} required onChange={(event) => setCurrencyField("symbol")(event.target.value)} />
          </FormField>
          <FormField id="currencyNumbering" label="Number format" required errors={errors?.currencyNumbering}>
            <OptionCombobox
              id="currencyNumbering"
              name="currencyNumbering"
              required
              options={numberingOptions}
              defaultValue={pick(numberingOptions, defaults.currencyNumbering)}
              onChange={(option) => option && setCurrency((current) => ({ ...current, numbering: option.value as NumberingSystem }))}
            />
          </FormField>
          <FormField id="currencyMajorName" label="Name in words" required errors={errors?.currencyMajorName} description="e.g. Dollars, Euros, Rupees">
            <Input id="currencyMajorName" name="currencyMajorName" defaultValue={defaults.currencyMajorName} required onChange={(event) => setCurrencyField("majorName")(event.target.value)} />
          </FormField>
          <FormField id="currencyMinorName" label="Fraction name" errors={errors?.currencyMinorName} description="e.g. Cents, Paisa">
            <Input id="currencyMinorName" name="currencyMinorName" defaultValue={defaults.currencyMinorName} onChange={(event) => setCurrencyField("minorName")(event.target.value)} />
          </FormField>
          <label htmlFor="showAmountInWords" className="flex items-start gap-3 text-sm sm:col-span-2 lg:col-span-3">
            <Switch id="showAmountInWords" checked={showWords} onCheckedChange={setShowWords} />
            <input type="hidden" name="showAmountInWords" value={String(showWords)} />
            <span>
              <span className="block font-medium">Print the total in words</span>
              <span className="text-muted-foreground">e.g. “Dollars One Hundred Only”. Expected on invoices in some countries.</span>
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Taxes are added on each invoice, so you can apply whatever your local rules require.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="invoiceTitle" label="Document title" required errors={errors?.invoiceTitle} description="e.g. Invoice, Tax Invoice">
            <Input id="invoiceTitle" name="invoiceTitle" defaultValue={defaults.invoiceTitle} required />
          </FormField>
          <FormField id="invoicePrefix" label="Number prefix" errors={errors?.invoicePrefix} description="Numbers look like INV-2026-0001.">
            <Input id="invoicePrefix" name="invoicePrefix" defaultValue={defaults.invoicePrefix} maxLength={10} className="font-mono" />
          </FormField>
          <FormField id="creditNotePrefix" label="Credit note prefix" errors={errors?.creditNotePrefix} description="Credit notes look like CN-2026-0001.">
            <Input id="creditNotePrefix" name="creditNotePrefix" defaultValue={defaults.creditNotePrefix} maxLength={10} className="font-mono" />
          </FormField>
          <FormField id="fiscalYearStartMonth" label="Fiscal year starts in" required errors={errors?.fiscalYearStartMonth} description="Invoice numbers restart each fiscal year.">
            <OptionCombobox
              id="fiscalYearStartMonth"
              name="fiscalYearStartMonth"
              required
              options={monthOptions}
              defaultValue={pick(monthOptions, String(defaults.fiscalYearStartMonth))}
            />
          </FormField>
          <FormField id="calendar" label="Calendar" required errors={errors?.calendar} description="Adds Bikram Sambat dates and fiscal year when selected.">
            <OptionCombobox id="calendar" name="calendar" required options={calendarOptions} defaultValue={pick(calendarOptions, defaults.calendar)} />
          </FormField>
          <FormField id="paymentTermsDays" label="Payment terms (days)" required errors={errors?.paymentTermsDays}>
            <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={180} defaultValue={defaults.paymentTermsDays} required />
          </FormField>
          <FormField id="recurringLeadDays" label="Create recurring drafts (days before due)" required errors={errors?.recurringLeadDays}>
            <Input id="recurringLeadDays" name="recurringLeadDays" type="number" min={0} max={60} defaultValue={defaults.recurringLeadDays} required />
          </FormField>
          <FormField id="bankDetails" label="Payment details" errors={errors?.bankDetails} description="Bank account, payment link or wallet details.">
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
