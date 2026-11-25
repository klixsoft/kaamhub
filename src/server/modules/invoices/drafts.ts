import "server-only"
import { eq } from "drizzle-orm"
import { calculateTotals, lineAmount } from "@/lib/invoice-math"
import type { Transaction } from "@/server/db"
import { clients, invoiceItems, invoices, invoiceTaxes } from "@/server/db/schema"
import { notFoundError } from "@/server/lib/errors"
import { currencyFormatOf, invoiceFormatOf } from "@/server/modules/settings/queries"
import type { BillingSettings } from "@/server/modules/settings/schema"
import type { InvoiceDraftInput, InvoiceItemInput } from "./schema"

type DraftValues = Omit<InvoiceDraftInput, "invoiceId"> & {
  serviceId?: string | null
  servicePeriodStart?: string | null
}

async function buyerSnapshot(tx: Transaction, clientId: string) {
  const [client] = await tx
    .select({ name: clients.name, address: clients.address, taxNumber: clients.taxNumber })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1)
  if (!client) throw notFoundError("Client")
  return { buyerName: client.name, buyerAddress: client.address, buyerTaxNumber: client.taxNumber }
}

function itemRows(invoiceId: string, items: InvoiceItemInput[]) {
  return items.map((item, position) => ({
    invoiceId,
    position,
    description: item.description,
    quantity: item.quantity,
    unit: item.unit ?? null,
    rate: item.rate,
    amount: lineAmount(item),
  }))
}

function draftColumns(values: DraftValues, billing: BillingSettings) {
  const { taxes, ...totals } = calculateTotals(values.items, values.discount, values.taxes)
  return {
    taxes,
    columns: {
      clientId: values.clientId,
      projectId: values.projectId ?? null,
      currency: currencyFormatOf(billing),
      format: invoiceFormatOf(billing),
      issueDate: values.issueDate,
      dueDate: values.dueDate ?? null,
      notes: values.notes ?? null,
      ...totals,
    },
  }
}

function taxRows(invoiceId: string, taxes: ReturnType<typeof draftColumns>["taxes"]) {
  return taxes.map((tax, position) => ({ invoiceId, position, ...tax }))
}

async function writeLines(tx: Transaction, invoiceId: string, values: DraftValues, taxes: ReturnType<typeof draftColumns>["taxes"]) {
  await tx.insert(invoiceItems).values(itemRows(invoiceId, values.items))
  if (taxes.length > 0) await tx.insert(invoiceTaxes).values(taxRows(invoiceId, taxes))
}

export async function insertDraft(tx: Transaction, values: DraftValues, billing: BillingSettings, createdById: string | null) {
  const draft = draftColumns(values, billing)
  const [created] = await tx
    .insert(invoices)
    .values({
      ...draft.columns,
      ...(await buyerSnapshot(tx, values.clientId)),
      serviceId: values.serviceId ?? null,
      servicePeriodStart: values.servicePeriodStart ?? null,
      createdById,
    })
    .onConflictDoNothing({ target: [invoices.serviceId, invoices.servicePeriodStart] })
    .returning({ id: invoices.id })
  if (!created) return null
  await writeLines(tx, created.id, values, draft.taxes)
  return created
}

export async function replaceDraft(tx: Transaction, invoiceId: string, values: DraftValues, billing: BillingSettings) {
  const draft = draftColumns(values, billing)
  await tx
    .update(invoices)
    .set({ ...draft.columns, ...(await buyerSnapshot(tx, values.clientId)) })
    .where(eq(invoices.id, invoiceId))
  await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
  await tx.delete(invoiceTaxes).where(eq(invoiceTaxes.invoiceId, invoiceId))
  await writeLines(tx, invoiceId, values, draft.taxes)
}
