import { z } from "zod"
import { PAYMENT_METHODS, TAX_TREATMENTS } from "@/config/finance"

const isoDate = z.iso.date("Enter a valid date")
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullish()

export const invoiceItemSchema = z.object({
  description: z.string().trim().min(2, "Describe the item").max(500),
  quantity: z.number("Enter a quantity").positive("Quantity must be more than zero").max(1_000_000),
  unit: optionalText(20),
  rate: z.number("Enter a rate").min(0).max(1_000_000_000),
})

export const invoiceDraftSchema = z
  .object({
    invoiceId: z.uuid().nullish(),
    clientId: z.uuid("Choose a client"),
    projectId: z.uuid().nullish(),
    taxTreatment: z.enum(TAX_TREATMENTS),
    issueDate: isoDate,
    dueDate: isoDate.nullish(),
    discount: z.number().min(0).max(1_000_000_000).default(0),
    notes: optionalText(2000),
    items: z.array(invoiceItemSchema).min(1, "Add at least one item").max(100),
  })
  .refine((value) => !value.dueDate || value.dueDate >= value.issueDate, {
    path: ["dueDate"],
    message: "Due date must be on or after the issue date",
  })

export type InvoiceDraftInput = z.infer<typeof invoiceDraftSchema>
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>

export const invoiceIdSchema = z.object({ invoiceId: z.uuid() })

export const cancelInvoiceSchema = z.object({
  invoiceId: z.uuid(),
  reason: z.string().trim().min(5, "Explain why the invoice is cancelled").max(500),
})

export const paymentSchema = z.object({
  invoiceId: z.uuid(),
  paidOn: isoDate,
  amount: z.coerce.number("Enter the amount").positive("Amount must be more than zero"),
  method: z.enum(PAYMENT_METHODS),
  reference: optionalText(120),
  note: optionalText(500),
})
