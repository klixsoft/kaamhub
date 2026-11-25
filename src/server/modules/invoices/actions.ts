"use server"

import { and, eq, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { InvoiceStatus } from "@/config/finance"
import { roundMoney } from "@/lib/money"
import { daysBetween, shiftDate, todayIso } from "@/lib/dates"
import { db, type Transaction } from "@/server/db"
import { clients, invoicePayments, invoices, projects } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, notFoundError } from "@/server/lib/errors"
import { getSettings, invoiceFormatOf } from "@/server/modules/settings/queries"
import { recordAudit } from "@/server/services/audit"
import { insertDraft, replaceDraft } from "./drafts"
import { allocateInvoiceNumber } from "./numbering"
import { cancelInvoiceSchema, invoiceDraftSchema, invoiceIdSchema, paymentSchema } from "./schema"
import { deliverInvoice } from "./delivery"

async function lockInvoice(tx: Transaction, invoiceId: string) {
  const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, invoiceId)).for("update").limit(1)
  if (!invoice) throw notFoundError("Invoice")
  return invoice
}

async function assertProjectBelongsToClient(projectId: string | null | undefined, clientId: string) {
  if (!projectId) return
  const [project] = await db.select({ clientId: projects.clientId }).from(projects).where(eq(projects.id, projectId)).limit(1)
  if (!project || project.clientId !== clientId) throw new AppError("The selected project belongs to a different client.")
}

function revalidateInvoice(invoiceId?: string) {
  revalidatePath("/invoices")
  if (invoiceId) revalidatePath(`/invoices/${invoiceId}`)
}

export const saveInvoiceDraft = action({
  schema: invoiceDraftSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId, ...values }, { user }) => {
    await assertProjectBelongsToClient(values.projectId, values.clientId)
    const billing = await getSettings("billing")

    const saved = await db.transaction(async (tx) => {
      if (!invoiceId) {
        const created = await insertDraft(tx, values, billing, user.id)
        if (!created) throw new Error("Draft insert returned no row")
        return created
      }
      const existing = await lockInvoice(tx, invoiceId)
      if (existing.status !== "draft") throw new AppError("Only draft invoices can be edited.")
      await replaceDraft(tx, invoiceId, values, billing)
      return { id: invoiceId }
    })

    await recordAudit({ actorId: user.id, action: invoiceId ? "invoice.draft_updated" : "invoice.draft_created", entityType: "invoice", entityId: saved.id })
    revalidateInvoice(saved.id)
    return saved
  },
})

export const deleteInvoiceDraft = action({
  schema: invoiceIdSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId }, { user }) => {
    const [deleted] = await db
      .delete(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "draft")))
      .returning({ id: invoices.id })
    if (!deleted) throw new AppError("Only draft invoices can be deleted. Cancel issued invoices instead.")
    await recordAudit({ actorId: user.id, action: "invoice.draft_deleted", entityType: "invoice", entityId: invoiceId })
    revalidateInvoice()
    return undefined
  },
})

export const issueInvoice = action({
  schema: invoiceIdSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId }, { user }) => {
    const billing = await getSettings("billing")
    if (!billing.legalName) throw new AppError("Add your registered company name in Billing settings before issuing invoices.")

    const issued = await db.transaction(async (tx) => {
      const invoice = await lockInvoice(tx, invoiceId)
      if (invoice.status !== "draft") throw new AppError("This invoice has already been issued.")
      if (invoice.currency.code !== billing.currencyCode) {
        throw new AppError("The billing currency changed since this draft was saved. Open the draft and save it again.")
      }
      const [client] = await tx
        .select({ name: clients.name, address: clients.address, taxNumber: clients.taxNumber })
        .from(clients)
        .where(eq(clients.id, invoice.clientId))
        .limit(1)
      const issueDate = todayIso()
      const dueDate = invoice.dueDate ? shiftDate(issueDate, daysBetween(invoice.issueDate, invoice.dueDate)) : null
      const { number, fiscalYear } = await allocateInvoiceNumber(tx, issueDate, {
        calendar: billing.calendar,
        startMonth: billing.fiscalYearStartMonth,
        prefix: billing.invoicePrefix,
      })
      const contact = [billing.phone, billing.email, billing.website].filter(Boolean).join(" · ")
      await tx
        .update(invoices)
        .set({
          number,
          fiscalYear,
          issueDate,
          dueDate,
          status: "issued",
          issuedAt: new Date(),
          sellerName: billing.legalName,
          sellerAddress: billing.address || null,
          sellerTaxNumber: billing.taxNumber || null,
          sellerContact: contact || null,
          format: invoiceFormatOf(billing),
          buyerName: client?.name ?? invoice.buyerName,
          buyerAddress: client?.address ?? invoice.buyerAddress,
          buyerTaxNumber: client?.taxNumber ?? invoice.buyerTaxNumber,
        })
        .where(eq(invoices.id, invoiceId))
      return { number }
    })

    await recordAudit({ actorId: user.id, action: "invoice.issued", entityType: "invoice", entityId: invoiceId, metadata: issued })
    revalidateInvoice(invoiceId)
    return issued
  },
})

export const cancelInvoice = formAction({
  schema: cancelInvoiceSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId, reason }, { user }) => {
    await db.transaction(async (tx) => {
      const invoice = await lockInvoice(tx, invoiceId)
      if (invoice.status === "draft") throw new AppError("Delete drafts instead of cancelling them.")
      if (invoice.status === "cancelled") throw new AppError("This invoice is already cancelled.")
      if (invoice.amountPaid > 0) throw new AppError("Invoices with recorded payments cannot be cancelled.")
      await tx.update(invoices).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: reason }).where(eq(invoices.id, invoiceId))
    })
    await recordAudit({ actorId: user.id, action: "invoice.cancelled", entityType: "invoice", entityId: invoiceId, metadata: { reason } })
    revalidateInvoice(invoiceId)
    return undefined
  },
})

function paymentStatus(total: number, paid: number): InvoiceStatus {
  if (paid >= total) return "paid"
  return paid > 0 ? "partially_paid" : "issued"
}

export const recordPayment = formAction({
  schema: paymentSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId, ...payment }, { user }) => {
    await db.transaction(async (tx) => {
      const invoice = await lockInvoice(tx, invoiceId)
      if (invoice.status === "draft" || invoice.status === "cancelled") throw new AppError("Payments can only be recorded on issued invoices.")
      const amount = roundMoney(payment.amount)
      const outstanding = roundMoney(invoice.total - invoice.amountPaid)
      if (amount > outstanding) throw new AppError(`The amount is more than the outstanding balance of ${outstanding.toFixed(2)}.`)

      await tx.insert(invoicePayments).values({ invoiceId, ...payment, amount, recordedById: user.id })
      const paid = roundMoney(invoice.amountPaid + amount)
      await tx
        .update(invoices)
        .set({ amountPaid: sql`${invoices.amountPaid} + ${amount}`, status: paymentStatus(invoice.total, paid) })
        .where(eq(invoices.id, invoiceId))
    })
    await recordAudit({ actorId: user.id, action: "invoice.payment_recorded", entityType: "invoice", entityId: invoiceId, metadata: { amount: payment.amount } })
    revalidateInvoice(invoiceId)
    return undefined
  },
})

export const sendInvoice = action({
  schema: invoiceIdSchema,
  permission: "finance:write",
  module: "invoices",
  handler: async ({ invoiceId }, { user }) => {
    const result = await deliverInvoice(invoiceId)
    await recordAudit({ actorId: user.id, action: "invoice.sent", entityType: "invoice", entityId: invoiceId, metadata: result })
    return result
  },
})
