"use client"

import { ExternalLinkIcon, MailIcon, PlusIcon, ReceiptIcon, Trash2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/components/forms/date-picker"
import { FormField } from "@/components/forms/form-field"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { CurrencyFormat } from "@/config/finance"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate } from "@/lib/format"
import { type CalculatedTax, calculateCredit, taxLabel } from "@/lib/invoice-math"
import { formatMoney } from "@/lib/money"
import { issueCreditNote, sendCreditNote } from "@/server/modules/invoices/credit-note-actions"
import type { InvoiceDetail } from "@/server/modules/invoices/queries"

interface CreditNotesSectionProps {
  invoiceId: string
  creditNotes: InvoiceDetail["creditNotes"]
  invoiceTaxes: Array<Pick<CalculatedTax, "name" | "kind" | "rate">>
  currency: CurrencyFormat
  available: number
  invoiceDate: string
  today: string
  canManage: boolean
  canIssue: boolean
}

interface LineState {
  key: number
  description: string
  amount: string
}

function IssueCreditNoteDialog({ invoiceId, invoiceTaxes, currency, available, invoiceDate, today }: Omit<CreditNotesSectionProps, "creditNotes" | "canManage" | "canIssue">) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [issueDate, setIssueDate] = useState<string | null>(today)
  const [reason, setReason] = useState("")
  const [lines, setLines] = useState<LineState[]>([{ key: 0, description: "", amount: "" }])
  const [error, setError] = useState<string | null>(null)

  const parsed = lines.map((line) => ({ description: line.description.trim(), amount: Number(line.amount) || 0 }))
  const credit = calculateCredit(parsed, invoiceTaxes)
  const fixedTaxes = invoiceTaxes.filter((tax) => tax.kind === "fixed")
  const money = (value: number) => formatMoney(value, currency)

  function update(key: number, patch: Partial<LineState>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }

  function submit() {
    if (!issueDate) return setError("Choose the credit note date.")
    if (credit.total > available) return setError(`The credit is more than the ${money(available)} left to credit on this invoice.`)
    startTransition(async () => {
      const result = await issueCreditNote({ invoiceId, issueDate, reason, lines: parsed })
      if (!result.ok) return setError(result.error)
      toast.success(`Credit note ${result.data.number} issued`)
      setOpen(false)
      setLines([{ key: 0, description: "", amount: "" }])
      setReason("")
      setError(null)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <PlusIcon aria-hidden />
            Issue credit note
          </Button>
        }
      />
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Issue a credit note</DialogTitle>
          <DialogDescription>
            Reduces what the client owes on this invoice, for example for a discount agreed later or work that was not delivered. Up to {money(available)} can be credited.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="credit-date" label="Date" required description={`On or after the invoice date, ${formatDate(invoiceDate)}.`}>
              <DatePicker id="credit-date" value={issueDate} onChange={setIssueDate} required />
            </FormField>
            <FormField id="credit-reason" label="Reason" required>
              <Textarea id="credit-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} />
            </FormField>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Credited amounts, before tax</legend>
            {lines.map((line, index) => (
              <div key={line.key} className="flex items-start gap-2">
                <Input
                  aria-label={`Line ${index + 1} description`}
                  placeholder="What is credited"
                  value={line.description}
                  onChange={(event) => update(line.key, { description: event.target.value })}
                  className="flex-1"
                />
                <Input
                  aria-label={`Line ${index + 1} amount`}
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={line.amount}
                  onChange={(event) => update(line.key, { amount: event.target.value })}
                  className="w-36 text-right tabular-nums"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove line ${index + 1}`}
                  disabled={lines.length === 1}
                  onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))}
                >
                  <Trash2Icon aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start"
              onClick={() => setLines((current) => [...current, { key: Math.max(...current.map((item) => item.key)) + 1, description: "", amount: "" }])}
            >
              <PlusIcon aria-hidden />
              Add line
            </Button>
          </fieldset>
          <dl className="ml-auto w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd className="tabular-nums">{money(credit.subtotal)}</dd>
            </div>
            {credit.taxes.map((tax) => (
              <div key={tax.name} className="flex justify-between">
                <dt className="text-muted-foreground">{taxLabel(tax)}</dt>
                <dd className="tabular-nums">{money(tax.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 font-semibold">
              <dt>Total credit</dt>
              <dd className="tabular-nums">{money(credit.total)}</dd>
            </div>
          </dl>
          {fixedTaxes.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Fixed charges ({fixedTaxes.map((tax) => tax.name).join(", ")}) are not reversed automatically. Add them as a line if they should be credited too.
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={isPending || credit.total <= 0 || reason.trim().length < 3}>
              {isPending ? "Issuing…" : "Issue credit note"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CreditNotesSection({ creditNotes, canManage, canIssue, currency, ...dialogProps }: CreditNotesSectionProps) {
  const { isPending, run } = useServerAction()
  if (creditNotes.length === 0 && !canIssue) return null

  return (
    <section aria-labelledby="credit-notes-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="credit-notes-heading" className="font-semibold">
          Credit notes
        </h2>
        {canIssue ? <IssueCreditNoteDialog currency={currency} {...dialogProps} /> : null}
      </div>
      {creditNotes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No credit notes. Issue one to reduce what the client owes on this invoice.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {creditNotes.map((note) => (
            <li key={note.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="flex min-w-0 items-start gap-2">
                <ReceiptIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <a href={`/api/credit-notes/${note.id}/pdf`} target="_blank" rel="noopener" className="font-medium hover:underline">
                    {note.number}
                  </a>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatDate(note.issueDate)} · {note.reason}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="font-medium tabular-nums">−{formatMoney(note.total, currency)}</span>
                <Button variant="ghost" size="icon-sm" nativeButton={false} aria-label={`Open ${note.number}`} render={<a href={`/api/credit-notes/${note.id}/pdf`} target="_blank" rel="noopener" />}>
                  <ExternalLinkIcon />
                </Button>
                {canManage ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Email ${note.number} to the client`}
                    disabled={isPending}
                    onClick={() => run(() => sendCreditNote({ creditNoteId: note.id }), undefined, (result) => toast.success(`Sent to ${result.recipients} recipient${result.recipients === 1 ? "" : "s"}`))}
                  >
                    <MailIcon />
                  </Button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
