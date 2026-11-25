"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/components/forms/date-picker"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CurrencyFormat, TaxKind } from "@/config/finance"
import { shiftDate } from "@/lib/dates"
import { calculateTotals, lineAmount } from "@/lib/invoice-math"
import { formatMoney } from "@/lib/money"
import type { Option } from "@/lib/options"
import { saveInvoiceDraft } from "@/server/modules/invoices/actions"
import { type TaxLineState, TaxLinesEditor } from "./tax-lines-editor"

interface LineState {
  key: string
  description: string
  quantity: string
  unit: string
  rate: string
}

export interface InvoiceFormDefaults {
  invoiceId: string
  client: Option
  project: Option | null
  taxes: Array<{ name: string; kind: TaxKind; value: number }>
  issueDate: string
  dueDate: string | null
  discount: number
  notes: string | null
  items: Array<{ description: string; quantity: number; unit: string | null; rate: number }>
}

interface InvoiceFormProps {
  currency: CurrencyFormat
  today: string
  paymentTermsDays: number
  defaults?: InvoiceFormDefaults
}

let lineCounter = 0
const newLine = (values?: Partial<LineState>): LineState => ({ key: `line-${lineCounter++}`, description: "", quantity: "1", unit: "", rate: "", ...values })
const newTaxLine = (values?: Partial<TaxLineState>): TaxLineState => ({ key: `tax-${lineCounter++}`, name: "", kind: "percentage", value: "", ...values })
const toNumber = (value: string) => (value.trim() === "" ? Number.NaN : Number(value))

export function InvoiceForm({ currency, today, paymentTermsDays, defaults }: InvoiceFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [client, setClient] = useState<Option | null>(defaults?.client ?? null)
  const [project, setProject] = useState<Option | null>(defaults?.project ?? null)
  const [taxLines, setTaxLines] = useState<TaxLineState[]>(
    defaults?.taxes.map((tax) => newTaxLine({ name: tax.name, kind: tax.kind, value: String(tax.value) })) ?? [],
  )
  const [issueDate, setIssueDate] = useState<string | null>(defaults?.issueDate ?? today)
  const [dueDate, setDueDate] = useState<string | null>(defaults ? defaults.dueDate : shiftDate(today, paymentTermsDays))
  const [discount, setDiscount] = useState(String(defaults?.discount ?? ""))
  const [notes, setNotes] = useState(defaults?.notes ?? "")
  const [lines, setLines] = useState<LineState[]>(
    defaults?.items.map((item) => newLine({ description: item.description, quantity: String(item.quantity), unit: item.unit ?? "", rate: String(item.rate) })) ?? [newLine()],
  )

  const numericLines = lines.map((line) => ({ quantity: toNumber(line.quantity) || 0, rate: toNumber(line.rate) || 0 }))
  const taxInputs = taxLines.map((line) => ({ name: line.name.trim(), kind: line.kind, value: toNumber(line.value) }))
  const totals = calculateTotals(numericLines, Number(discount) || 0, taxInputs.map((tax) => ({ ...tax, value: tax.value || 0 })))
  const money = (value: number) => formatMoney(value, currency)

  const updateLine = (key: string, patch: Partial<LineState>) => setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))

  function submit() {
    setError(null)
    if (!client) return setError("Choose a client.")
    if (!issueDate) return setError("Choose the invoice date.")
    const items = lines.map((line) => ({ description: line.description, quantity: toNumber(line.quantity), unit: line.unit, rate: toNumber(line.rate) }))
    if (items.some((item) => !item.description.trim() || !Number.isFinite(item.quantity) || !Number.isFinite(item.rate))) {
      return setError("Every item needs a description, quantity and rate.")
    }
    if (taxInputs.some((tax) => !tax.name || !Number.isFinite(tax.value))) {
      return setError("Every tax needs a name and a rate or amount.")
    }

    startTransition(async () => {
      const result = await saveInvoiceDraft({
        invoiceId: defaults?.invoiceId ?? null,
        clientId: client.value,
        projectId: project?.value ?? null,
        taxes: taxInputs,
        issueDate,
        dueDate,
        discount: Number(discount) || 0,
        notes,
        items,
      })
      if (!result.ok) {
        const fieldMessage = result.fieldErrors ? Object.values(result.fieldErrors).flat()[0] : undefined
        return setError(fieldMessage ?? result.error)
      }
      toast.success("Draft saved")
      router.push(`/invoices/${result.data.id}`)
    })
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField id="invoice-client" label="Client" required>
            <OptionCombobox
              id="invoice-client"
              resource="clients"
              value={client}
              onChange={(next) => {
                setClient(next)
                setProject(null)
              }}
              placeholder="Search clients…"
            />
          </FormField>
          <FormField id="invoice-project" label="Project">
            <OptionCombobox
              key={client?.value ?? "none"}
              id="invoice-project"
              resource="client-projects"
              resourceParams={client ? { clientId: client.value } : undefined}
              value={project}
              onChange={setProject}
              disabled={!client}
              placeholder={client ? "Search this client's projects…" : "Choose a client first"}
            />
          </FormField>
          <FormField id="invoice-date" label="Invoice date" required description="Replaced with the actual date when the invoice is issued.">
            <DatePicker id="invoice-date" value={issueDate} onChange={setIssueDate} required />
          </FormField>
          <FormField id="invoice-due" label="Due date">
            <DatePicker id="invoice-due" value={dueDate} onChange={setDueDate} />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="hidden grid-cols-[1fr_6rem_6rem_8rem_8rem_2rem] gap-2 text-xs font-medium text-muted-foreground md:grid">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span>Unit</span>
            <span className="text-right">Rate</span>
            <span className="text-right">Amount</span>
            <span className="sr-only">Remove</span>
          </div>
          <ol className="flex flex-col gap-3">
            {lines.map((line, index) => (
              <li key={line.key} className="grid grid-cols-2 gap-2 rounded-lg border p-3 md:grid-cols-[1fr_6rem_6rem_8rem_8rem_2rem] md:items-center md:border-0 md:p-0">
                <Input
                  className="col-span-2 md:col-span-1"
                  aria-label={`Item ${index + 1} description`}
                  placeholder="Description"
                  value={line.description}
                  onChange={(event) => updateLine(line.key, { description: event.target.value })}
                />
                <Input
                  aria-label={`Item ${index + 1} quantity`}
                  type="number"
                  min={0}
                  step="any"
                  className="text-right"
                  value={line.quantity}
                  onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                />
                <Input
                  aria-label={`Item ${index + 1} unit`}
                  placeholder="Unit"
                  value={line.unit}
                  onChange={(event) => updateLine(line.key, { unit: event.target.value })}
                />
                <Input
                  aria-label={`Item ${index + 1} rate`}
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  className="text-right"
                  value={line.rate}
                  onChange={(event) => updateLine(line.key, { rate: event.target.value })}
                />
                <span className="self-center text-right text-sm tabular-nums">{money(lineAmount(numericLines[index] ?? { quantity: 0, rate: 0 }))}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="justify-self-end"
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                  aria-label={`Remove item ${index + 1}`}
                >
                  <Trash2Icon />
                </Button>
              </li>
            ))}
          </ol>
          <Button type="button" variant="outline" className="self-start" onClick={() => setLines((current) => [...current, newLine()])}>
            <PlusIcon aria-hidden />
            Add item
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <FormField id="invoice-notes" label="Notes">
              <Textarea id="invoice-notes" rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </FormField>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6 text-sm">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">{money(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="invoice-discount">Discount</label>
              <Input
                id="invoice-discount"
                type="number"
                min={0}
                step="any"
                className="w-40 text-right"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </div>
            <div className="flex justify-between">
              <span>{taxLines.length > 0 ? "Taxable amount" : "Amount before tax"}</span>
              <span className="tabular-nums">{money(totals.taxableAmount)}</span>
            </div>
            <div className="flex flex-col gap-2 border-t pt-3">
              <span className="font-medium">Taxes</span>
              <TaxLinesEditor lines={taxLines} calculated={totals.taxes} onChange={setTaxLines} formatAmount={money} createLine={newTaxLine} />
              {taxLines.some((line) => line.kind === "percentage") ? (
                <p className="text-xs text-muted-foreground">Percentage taxes are calculated on the taxable amount. Fixed taxes are added as entered.</p>
              ) : null}
            </div>
            <div className="mt-2 flex justify-between border-t pt-3 text-base font-semibold">
              <span>Total</span>
              <span className="tabular-nums">{money(totals.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <SubmitButton pending={isPending} pendingLabel="Saving…">
          Save draft
        </SubmitButton>
      </div>
    </form>
  )
}
