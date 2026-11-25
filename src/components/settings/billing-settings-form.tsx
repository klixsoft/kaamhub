"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NUMBERING_SYSTEM_LABELS, TAX_REGISTRATION_LABELS } from "@/config/finance"
import { amountInWords, formatMoney } from "@/lib/money"
import { type Option, toOptions } from "@/lib/options"
import { saveBillingSettings } from "@/server/modules/settings/actions"
import type { BillingSettings } from "@/server/modules/settings/schema"

const registrationOptions = toOptions(TAX_REGISTRATION_LABELS)
const numberingOptions = toOptions(NUMBERING_SYSTEM_LABELS)
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null

export function BillingSettingsForm({ defaults }: { defaults: BillingSettings }) {
  const [state, submit] = useActionState(saveBillingSettings, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const invalid = (field: string) => Boolean(errors?.[field]) || undefined
  const currencyPreview = {
    code: defaults.currencyCode,
    symbol: defaults.currencySymbol,
    majorName: defaults.currencyMajorName,
    minorName: defaults.currencyMinorName,
    numbering: defaults.currencyNumbering,
  }

  useEffect(() => {
    if (state?.ok) toast.success("Billing settings saved")
  }, [state])

  return (
    <form action={submit} className="flex flex-col gap-6">
      <FormAlert state={state} />
      <Card>
        <CardHeader>
          <CardTitle>Company tax details</CardTitle>
          <CardDescription>Printed on every invoice. Issued invoices keep the details they were issued with.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="legalName" label="Registered company name" required errors={errors?.legalName}>
            <Input id="legalName" name="legalName" defaultValue={defaults.legalName} required aria-invalid={invalid("legalName")} />
          </FormField>
          <FormField id="taxRegistration" label="Tax registration" required errors={errors?.taxRegistration}>
            <OptionCombobox
              id="taxRegistration"
              name="taxRegistration"
              required
              options={registrationOptions}
              defaultValue={pick(registrationOptions, defaults.taxRegistration)}
            />
          </FormField>
          <FormField id="taxNumber" label="PAN / VAT number" errors={errors?.taxNumber} description="9 digits, as on your registration certificate.">
            <Input id="taxNumber" name="taxNumber" inputMode="numeric" maxLength={9} defaultValue={defaults.taxNumber} aria-invalid={invalid("taxNumber")} />
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
          <FormField id="billingAddress" label="Address" errors={errors?.address} className="sm:col-span-2">
            <Textarea id="billingAddress" name="address" rows={2} defaultValue={defaults.address} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Currency</CardTitle>
          <CardDescription>
            Used for every invoice and service. Example: {formatMoney(125430.5, currencyPreview)} — {amountInWords(125430.5, currencyPreview)}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="currencyCode" label="Currency code" required errors={errors?.currencyCode}>
            <Input id="currencyCode" name="currencyCode" defaultValue={defaults.currencyCode} maxLength={3} className="font-mono uppercase" required />
          </FormField>
          <FormField id="currencySymbol" label="Symbol" required errors={errors?.currencySymbol}>
            <Input id="currencySymbol" name="currencySymbol" defaultValue={defaults.currencySymbol} maxLength={6} required />
          </FormField>
          <FormField id="currencyNumbering" label="Number format" required errors={errors?.currencyNumbering}>
            <OptionCombobox
              id="currencyNumbering"
              name="currencyNumbering"
              required
              options={numberingOptions}
              defaultValue={pick(numberingOptions, defaults.currencyNumbering)}
            />
          </FormField>
          <FormField id="currencyMajorName" label="Name in words" required errors={errors?.currencyMajorName} description="e.g. Rupees">
            <Input id="currencyMajorName" name="currencyMajorName" defaultValue={defaults.currencyMajorName} required />
          </FormField>
          <FormField id="currencyMinorName" label="Fraction name" errors={errors?.currencyMinorName} description="e.g. Paisa">
            <Input id="currencyMinorName" name="currencyMinorName" defaultValue={defaults.currencyMinorName} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <FormField id="paymentTermsDays" label="Payment terms (days)" required errors={errors?.paymentTermsDays}>
            <Input id="paymentTermsDays" name="paymentTermsDays" type="number" min={0} max={180} defaultValue={defaults.paymentTermsDays} required />
          </FormField>
          <FormField
            id="recurringLeadDays"
            label="Create recurring drafts (days before due)"
            required
            errors={errors?.recurringLeadDays}
          >
            <Input id="recurringLeadDays" name="recurringLeadDays" type="number" min={0} max={60} defaultValue={defaults.recurringLeadDays} required />
          </FormField>
          <FormField id="bankDetails" label="Payment details" errors={errors?.bankDetails} description="Bank account, QR or wallet details printed on invoices.">
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
