import { NextResponse } from "next/server"
import { canSeeInvoices } from "@/server/modules/invoices/access"
import { getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { invoiceFileName, renderInvoicePdf } from "@/server/modules/invoices/pdf"
import { getInvoice } from "@/server/modules/invoices/queries"
import { toInvoiceView } from "@/server/modules/invoices/view"
import { getSettings } from "@/server/modules/settings/queries"

export async function GET(request: Request, context: RouteContext<"/api/invoices/[invoiceId]/pdf">) {
  const { invoiceId } = await context.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (!canSeeInvoices(user) || !isUuid(invoiceId)) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const invoice = await getInvoice(user, invoiceId)
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const view = toInvoiceView(invoice, await getSettings("billing"))
    const pdf = await renderInvoicePdf(view)
    const disposition = new URL(request.url).searchParams.get("download") ? "attachment" : "inline"
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${invoiceFileName(view)}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    logger.error("Invoice PDF generation failed", { error, invoiceId })
    return NextResponse.json({ error: "Could not generate the PDF" }, { status: 500 })
  }
}
