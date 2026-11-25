import "server-only"
import type { CurrencyFormat, InvoiceStatus, TaxTreatment } from "@/config/finance"
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
  taxTreatment: TaxTreatment
  seller: { name: string; address: string | null; contact: string | null; taxNumber: string | null; taxLabel: string }
  buyer: { name: string; address: string | null; taxNumber: string | null }
  projectName: string | null
  items: Array<{ id: string; description: string; quantity: number; unit: string | null; rate: number; amount: number }>
  subtotal: number
  discount: number
  taxableAmount: number
  vatRate: number
  vatAmount: number
  total: number
  amountPaid: number
  notes: string | null
  cancelReason: string | null
  bankDetails: string | null
  footer: string
}

export function toInvoiceView(invoice: InvoiceDetail, billing: BillingSettings): InvoiceView {
  const issued = invoice.status !== "draft"
  const isVatInvoice = billing.taxRegistration === "vat" && invoice.taxTreatment !== "exempt"
  const contact = [billing.phone, billing.email, billing.website].filter(Boolean).join(" · ")

  return {
    number: invoice.number,
    fiscalYear: invoice.fiscalYear,
    status: invoice.status,
    title: isVatInvoice ? "TAX INVOICE" : "INVOICE",
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    taxTreatment: invoice.taxTreatment,
    seller: {
      name: (issued ? invoice.sellerName : billing.legalName) || "Your company",
      address: issued ? invoice.sellerAddress : billing.address || null,
      contact: contact || null,
      taxNumber: issued ? invoice.sellerTaxNumber : billing.taxNumber || null,
      taxLabel: billing.taxRegistration === "vat" ? "VAT No." : "PAN No.",
    },
    buyer: { name: invoice.buyerName, address: invoice.buyerAddress, taxNumber: invoice.buyerTaxNumber },
    projectName: invoice.projectName,
    items: invoice.items,
    subtotal: invoice.subtotal,
    discount: invoice.discount,
    taxableAmount: invoice.taxableAmount,
    vatRate: invoice.vatRate,
    vatAmount: invoice.vatAmount,
    total: invoice.total,
    amountPaid: invoice.amountPaid,
    notes: invoice.notes,
    cancelReason: invoice.cancelReason,
    bankDetails: billing.bankDetails || null,
    footer: billing.invoiceFooter || "Thank you for your business.",
  }
}
