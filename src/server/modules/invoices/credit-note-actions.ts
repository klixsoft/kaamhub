"use server"

import { eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { calculateCredit, settlementStatus } from "@/lib/invoice-math"
import { roundMoney } from "@/lib/money"
import { db } from "@/server/db"
import { creditNotes, invoices, invoiceTaxes } from "@/server/db/schema"
import { action } from "@/server/lib/action"
import { AppError, notFoundError } from "@/server/lib/errors"
import { getSettings } from "@/server/modules/settings/queries"
import { recordAudit } from "@/server/services/audit"
import { allocateCreditNoteNumber, deliverCreditNote, getCreditNote } from "./credit-notes"
import { creditNoteIdSchema, creditNoteSchema } from "./schema"

export const issueCreditNote = action({
  schema: creditNoteSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId, issueDate, reason, lines }, { user }) => {
    const billing = await getSettings("billing")
    const created = await db.transaction(async (tx) => {
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update").limit(1)
      if (!invoice) throw notFoundError("Invoice")
      if (invoice.status === "draft" || invoice.status === "cancelled") throw new AppError("Credit notes can only be issued against issued invoices.")
      if (invoice.issueDate > issueDate) throw new AppError("A credit note cannot be dated before its invoice.")

      const taxes = await tx
        .select({ name: invoiceTaxes.name, kind: invoiceTaxes.kind, rate: invoiceTaxes.rate })
        .from(invoiceTaxes)
        .where(eq(invoiceTaxes.invoiceId, invoiceId))
      const credit = calculateCredit(lines, taxes)
      const available = roundMoney(invoice.total - invoice.amountCredited)
      if (credit.total > available) throw new AppError(`The credit of ${credit.total.toFixed(2)} is more than the ${available.toFixed(2)} left to credit on this invoice.`)

      const { number, fiscalYear } = await allocateCreditNoteNumber(tx, issueDate, {
        calendar: billing.calendar,
        startMonth: billing.fiscalYearStartMonth,
        prefix: billing.creditNotePrefix,
      })
      const [note] = await tx
        .insert(creditNotes)
        .values({ invoiceId, number, fiscalYear, issueDate, reason, lines, taxes: credit.taxes, subtotal: credit.subtotal, taxAmount: credit.taxAmount, total: credit.total, createdById: user.id })
        .returning({ id: creditNotes.id, number: creditNotes.number })
      const credited = roundMoney(invoice.amountCredited + credit.total)
      await tx
        .update(invoices)
        .set({ amountCredited: sql`${invoices.amountCredited} + ${credit.total}`, status: settlementStatus({ ...invoice, amountCredited: credited }) })
        .where(eq(invoices.id, invoiceId))
      return note
    })
    if (!created) throw new Error("Credit note insert returned no row")
    await recordAudit({ actorId: user.id, action: "invoice.credit_note_issued", entityType: "invoice", entityId: invoiceId, metadata: { creditNoteId: created.id, number: created.number } })
    revalidatePath("/invoices")
    revalidatePath(`/invoices/${invoiceId}`)
    return created
  },
})

export const sendCreditNote = action({
  schema: creditNoteIdSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ creditNoteId }, { user }) => {
    const creditNote = await getCreditNote(creditNoteId)
    if (!creditNote) throw notFoundError("Credit note")
    const result = await deliverCreditNote(creditNoteId)
    await recordAudit({ actorId: user.id, action: "invoice.credit_note_sent", entityType: "invoice", entityId: creditNote.invoiceId, metadata: { creditNoteId, ...result } })
    return result
  },
})
