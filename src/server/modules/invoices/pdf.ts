import "server-only"
import { renderToBuffer } from "@react-pdf/renderer"
import { InvoiceDocument } from "./document"
import type { InvoiceView } from "./view"

export async function renderInvoicePdf(invoice: InvoiceView): Promise<Buffer> {
  return renderToBuffer(InvoiceDocument({ invoice }))
}

export function invoiceFileName(invoice: Pick<InvoiceView, "number">): string {
  return `invoice-${(invoice.number ?? "draft").replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`
}
