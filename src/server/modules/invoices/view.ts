import "server-only"
import type { Calendar, CurrencyFormat, InvoiceStatus } from "@/config/finance"
import type { CalculatedTax } from "@/lib/invoice-math"
import { invoiceFormatOf } from "@/server/modules/settings/queries"
import type { BillingSettings } from "@/server/modules/settings/schema"
import type { InvoiceDetail } from "./queries"

export interface InvoiceView {
  number: string | null
  fiscalYear: string | null
  status: InvoiceStatus
  title: string
  issueDate: string
  dueDate: string | null
  currency: CurrencyFormat
  calendar: Calendar
  showAmountInWords: boolean
  seller: { name: string; address: string | null; contact: string | null; taxNumber: string | null; taxLabel: string }
  buyer: { name: string; address: string | null; taxNumber: string | null }
  projectName: string | null
  items: Array<{ id: string; description: string; quantity: number; unit: string | null; rate: number; amount: number }>
  subtotal: number
  discount: number
  taxableAmount: number
  taxes: CalculatedTax[]
  taxAmount: number
  total: number
  amountPaid: number
  notes: string | null
  cancelReason: string | null
  bankDetails: string | null
  footer: string
}

export function toInvoiceView(invoice: InvoiceDetail, billing: BillingSettings): InvoiceView {
  const issued = invoice.status !== "draft"
  const format = issued && invoice.format ? invoice.format : invoiceFormatOf(billing)
  const contact = issued ? invoice.sellerContact : [billing.phone, billing.email, billing.website].filter(Boolean).join(" · ")

  return {
    number: invoice.number,
    fiscalYear: invoice.fiscalYear,
    status: invoice.status,
    title: format.title,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    calendar: format.calendar,
    showAmountInWords: format.showAmountInWords,
    seller: {
      name: (issued ? invoice.sellerName : billing.legalName) || "Your company",
      address: issued ? invoice.sellerAddress : billing.address || null,
      contact: contact || null,
      taxNumber: issued ? invoice.sellerTaxNumber : billing.taxNumber || null,
      taxLabel: format.taxIdLabel,
    },
    buyer: { name: invoice.buyerName, address: invoice.buyerAddress, taxNumber: invoice.buyerTaxNumber },
    projectName: invoice.projectName,
    items: invoice.items,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxableAmount: invoice.taxableAmount,
    taxes: invoice.taxes,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    notes: invoice.notes,
    cancelReason: invoice.cancelReason,
    bankDetails: billing.bankDetails || null,
    footer: billing.invoiceFooter || "Thank you for your business.",
  }
}
