import "server-only"
import { eq, sql } from "drizzle-orm"
import { formatDate } from "@/lib/format"
import { formatMoney } from "@/lib/money"
import type { Transaction } from "@/server/db"
import { db } from "@/server/db"
import { creditNotes, creditNoteSequences } from "@/server/db/schema"
import { AppError } from "@/server/lib/errors"
import { type FiscalYearRule, fiscalYearLabel } from "@/lib/fiscal-year"
import { getSettings } from "@/server/modules/settings/queries"
import { sendMail } from "@/server/services/mailer"
import { recipientsFor } from "./delivery"
import { invoiceFileName, renderInvoicePdf } from "./pdf"
import { fetchInvoice } from "./queries"
import { toCreditNoteView } from "./view"

export async function allocateCreditNoteNumber(tx: Transaction, issueDate: string, rule: FiscalYearRule & { prefix: string }) {
  const fiscalYear = fiscalYearLabel(issueDate, rule)
  const [row] = await tx
    .insert(creditNoteSequences)
    .values({ fiscalYear, lastNumber: 1 })
    .onConflictDoUpdate({ target: creditNoteSequences.fiscalYear, set: { lastNumber: sql`${creditNoteSequences.lastNumber} + 1` } })
    .returning({ value: creditNoteSequences.lastNumber })
  if (!row) throw new Error("Credit note sequence allocation returned no row")
  return { number: `${rule.prefix}${fiscalYear}-${String(row.value).padStart(4, "0")}`, fiscalYear }
}

export async function getCreditNote(creditNoteId: string) {
  const [creditNote] = await db.select().from(creditNotes).where(eq(creditNotes.id, creditNoteId)).limit(1)
  return creditNote ?? null
}

export async function creditNotePdf(creditNoteId: string) {
  const creditNote = await getCreditNote(creditNoteId)
  if (!creditNote) return null
  const [invoice, billing] = await Promise.all([fetchInvoice(creditNote.invoiceId), getSettings("billing")])
  if (!invoice) return null
  const view = toCreditNoteView(invoice, creditNote, billing)
  return { creditNote, invoice, view, pdf: await renderInvoicePdf(view), fileName: invoiceFileName(view).replace(/^invoice-/, "credit-note-") }
}

export async function deliverCreditNote(creditNoteId: string): Promise<{ recipients: number }> {
  const document = await creditNotePdf(creditNoteId)
  if (!document) throw new AppError("This credit note was not found.", "NOT_FOUND")
  const { creditNote, invoice, view, pdf, fileName } = document
  const recipients = await recipientsFor(invoice.clientId, invoice.clientEmail)
  if (recipients.length === 0) throw new AppError("This client has no email address or portal contacts.")

  await sendMail({
    to: recipients,
    subject: `Credit note ${creditNote.number} from ${view.seller.name}`,
    text: [
      `Dear ${invoice.buyerName},`,
      "",
      `Please find attached credit note ${creditNote.number} dated ${formatDate(creditNote.issueDate)} for ${formatMoney(creditNote.total, invoice.currency)}, against invoice ${invoice.number}.`,
      `Reason: ${creditNote.reason}`,
      "",
      `Regards,\n${view.seller.name}`,
    ].join("\n"),
    attachments: [{ filename: fileName, content: pdf, contentType: "application/pdf" }],
  })
  return { recipients: recipients.length }
}
