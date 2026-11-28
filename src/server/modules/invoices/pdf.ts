import "server-only"
import { renderToBuffer } from "@react-pdf/renderer"
import { imageExtension } from "@/server/lib/image-upload"
import { readFileBuffer } from "@/server/lib/storage"
import { getSettings } from "@/server/modules/settings/queries"
import { InvoiceDocument, type PdfLogo } from "./document"
import type { InvoiceView } from "./view"

export async function companyLogo(): Promise<PdfLogo | null> {
  const { logoKey } = await getSettings("branding")
  const data = logoKey ? await readFileBuffer(logoKey) : null
  return data && logoKey ? { data, format: imageExtension(logoKey) } : null
}

export async function renderInvoicePdf(invoice: InvoiceView): Promise<Buffer> {
  return renderToBuffer(InvoiceDocument({ invoice, logo: await companyLogo() }))
}

export function invoiceFileName(invoice: Pick<InvoiceView, "number">): string {
  return `invoice-${(invoice.number ?? "draft").replace(/[^A-Za-z0-9-]+/g, "-")}.pdf`
}
