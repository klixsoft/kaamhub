"use client"

import { BanIcon, DownloadIcon, ExternalLinkIcon, MailIcon, PencilIcon, SendIcon, Trash2Icon, WalletIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { ButtonLink } from "@/components/layout/button-link"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { DatePicker } from "@/components/forms/date-picker"
import { FormAlert } from "@/components/forms/form-alert"
import { FormDialog } from "@/components/forms/form-dialog"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type InvoiceStatus, PAYMENT_METHOD_LABELS } from "@/config/finance"
import { useServerAction } from "@/hooks/use-server-action"
import { toOptions } from "@/lib/options"
import { cancelInvoice, deleteInvoiceDraft, issueInvoice, recordPayment, sendInvoice } from "@/server/modules/invoices/actions"

const methodOptions = toOptions(PAYMENT_METHOD_LABELS)

function PaymentForm({ invoiceId, outstanding, today, onSaved }: { invoiceId: string; outstanding: number; today: string; onSaved: () => void }) {
  const [state, submit] = useActionState(recordPayment, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  useEffect(() => {
    if (!state?.ok) return
    toast.success("Payment recorded")
    onSaved()
  }, [state, onSaved])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="payment-amount" label="Amount" required errors={errors?.amount}>
        <Input id="payment-amount" name="amount" type="number" min={0} step="any" defaultValue={outstanding.toFixed(2)} required />
      </FormField>
      <FormField id="payment-date" label="Received on" required errors={errors?.paidOn}>
        <DatePicker id="payment-date" name="paidOn" defaultValue={today} required />
      </FormField>
      <FormField id="payment-method" label="Method" required errors={errors?.method}>
        <OptionCombobox id="payment-method" name="method" required options={methodOptions} defaultValue={methodOptions[0] ?? null} />
      </FormField>
      <FormField id="payment-reference" label="Reference" errors={errors?.reference} description="Transaction ID or cheque number">
        <Input id="payment-reference" name="reference" />
      </FormField>
      <FormField id="payment-note" label="Note" errors={errors?.note} className="sm:col-span-2">
        <Textarea id="payment-note" name="note" rows={2} />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">Record payment</SubmitButton>
      </div>
    </form>
  )
}

function CancelForm({ invoiceId, onSaved }: { invoiceId: string; onSaved: () => void }) {
  const [state, submit] = useActionState(cancelInvoice, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  useEffect(() => {
    if (!state?.ok) return
    toast.success("Invoice cancelled")
    onSaved()
  }, [state, onSaved])

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <FormAlert state={state} />
      <FormField id="cancel-reason" label="Reason" required errors={errors?.reason} description="Kept on record and printed on the cancelled invoice.">
        <Textarea id="cancel-reason" name="reason" rows={3} required />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton variant="destructive" pendingLabel="Cancelling…">
          Cancel invoice
        </SubmitButton>
      </div>
    </form>
  )
}

interface InvoiceActionsProps {
  invoiceId: string
  status: InvoiceStatus
  outstanding: number
  today: string
  canManage: boolean
}

export function InvoiceActions({ invoiceId, status, outstanding, today, canManage }: InvoiceActionsProps) {
  const router = useRouter()
  const { isPending, run } = useServerAction()
  const pdfUrl = `/api/invoices/${invoiceId}/pdf`
  const isOpen = status === "issued" || status === "partially_paid"

  return (
    <div className="flex flex-wrap gap-2">
      <ButtonLink href={pdfUrl} target="_blank" rel="noopener" variant="outline" prefetch={false}>
        <ExternalLinkIcon aria-hidden />
        View PDF
      </ButtonLink>
      <ButtonLink href={`${pdfUrl}?download=1`} variant="outline" prefetch={false}>
        <DownloadIcon aria-hidden />
        Download
      </ButtonLink>
      {canManage && status === "draft" ? (
        <>
          <ButtonLink href={`/invoices/${invoiceId}/edit`} variant="outline">
            <PencilIcon aria-hidden />
            Edit
          </ButtonLink>
          <ConfirmDialog
            trigger={
              <Button variant="ghost" className="text-destructive" disabled={isPending}>
                <Trash2Icon aria-hidden />
                Delete
              </Button>
            }
            title="Delete this draft?"
            description="Drafts have no invoice number yet, so they can be removed completely."
            confirmLabel="Delete draft"
            destructive
            onConfirm={() => run(() => deleteInvoiceDraft({ invoiceId }), "Draft deleted", () => router.push("/invoices"))}
          />
          <ConfirmDialog
            trigger={
              <Button disabled={isPending}>
                <SendIcon aria-hidden />
                Issue invoice
              </Button>
            }
            title="Issue this invoice?"
            description="It gets the next invoice number for the fiscal year and today's date. Issued invoices cannot be edited or deleted, only cancelled."
            confirmLabel="Issue"
            onConfirm={() => run(() => issueInvoice({ invoiceId }), undefined, (result) => toast.success(`Invoice ${result.number} issued`))}
          />
        </>
      ) : null}
      {canManage && status !== "draft" && status !== "cancelled" ? (
        <Button
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => sendInvoice({ invoiceId }), undefined, (result) => toast.success(`Sent to ${result.recipients} recipient${result.recipients === 1 ? "" : "s"}`))}
        >
          <MailIcon aria-hidden />
          Email to client
        </Button>
      ) : null}
      {canManage && isOpen ? (
        <FormDialog
          title="Record payment"
          trigger={
            <Button>
              <WalletIcon aria-hidden />
              Record payment
            </Button>
          }
        >
          {(close) => <PaymentForm invoiceId={invoiceId} outstanding={outstanding} today={today} onSaved={close} />}
        </FormDialog>
      ) : null}
      {canManage && status === "issued" ? (
        <FormDialog
          title="Cancel invoice"
          description="The invoice number stays reserved and the invoice remains on record as cancelled."
          className="sm:max-w-md"
          trigger={
            <Button variant="ghost" className="text-destructive">
              <BanIcon aria-hidden />
              Cancel
            </Button>
          }
        >
          {(close) => <CancelForm invoiceId={invoiceId} onSaved={close} />}
        </FormDialog>
      ) : null}
    </div>
  )
}
