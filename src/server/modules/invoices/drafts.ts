import "server-only"
import { eq } from "drizzle-orm"
import { calculateTotals, lineAmount } from "@/lib/invoice-math"
import type { Transaction } from "@/server/db"
import { clients, invoiceItems, invoices } from "@/server/db/schema"
import { AppError, notFoundError } from "@/server/lib/errors"
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

export function assertTreatmentAllowed(billing: BillingSettings, treatment: InvoiceDraftInput["taxTreatment"]) {
  if (!billing.chargesTax && treatment !== "exempt") {
    throw new AppError(`Your company is set up not to charge ${billing.taxName}. Choose “No ${billing.taxName}” or update Billing settings.`)
  }
}

function draftColumns(values: DraftValues, billing: BillingSettings) {
  assertTreatmentAllowed(billing, values.taxTreatment)
  const totals = calculateTotals(values.items, values.discount, values.taxTreatment, billing.taxRate)
  return {
    clientId: values.clientId,
    projectId: values.projectId ?? null,
    taxTreatment: values.taxTreatment,
    currency: currencyFormatOf(billing),
    format: invoiceFormatOf(billing),
    issueDate: values.issueDate,
    dueDate: values.dueDate ?? null,
    notes: values.notes ?? null,
    ...totals,
  }
}

export async function insertDraft(tx: Transaction, values: DraftValues, billing: BillingSettings, createdById: string | null) {
  const [created] = await tx
    .insert(invoices)
    .values({
      ...draftColumns(values, billing),
      ...(await buyerSnapshot(tx, values.clientId)),
      serviceId: values.serviceId ?? null,
      servicePeriodStart: values.servicePeriodStart ?? null,
      createdById,
    })
    .onConflictDoNothing({ target: [invoices.serviceId, invoices.servicePeriodStart] })
    .returning({ id: invoices.id })
  if (!created) return null
  await tx.insert(invoiceItems).values(itemRows(created.id, values.items))
  return created
}

export async function replaceDraft(tx: Transaction, invoiceId: string, values: DraftValues, billing: BillingSettings) {
  await tx
    .update(invoices)
    .set({ ...draftColumns(values, billing), ...(await buyerSnapshot(tx, values.clientId)) })
    .where(eq(invoices.id, invoiceId))
  await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId))
  await tx.insert(invoiceItems).values(itemRows(invoiceId, values.items))
}
