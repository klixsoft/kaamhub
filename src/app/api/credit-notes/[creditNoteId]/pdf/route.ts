import { NextResponse } from "next/server"
import { getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { canSeeInvoices } from "@/server/modules/invoices/access"
import { creditNotePdf, getCreditNote } from "@/server/modules/invoices/credit-notes"
import { getInvoice } from "@/server/modules/invoices/queries"
import { isModuleEnabled } from "@/server/modules/settings/queries"

export async function GET(request: Request, context: RouteContext<"/api/credit-notes/[creditNoteId]/pdf">) {
  const { creditNoteId } = await context.params
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  if (!isUuid(creditNoteId) || !canSeeInvoices(user) || !(await isModuleEnabled("invoices"))) return new NextResponse("Not found", { status: 404 })

  try {
    const creditNote = await getCreditNote(creditNoteId)
    if (!creditNote || !(await getInvoice(user, creditNote.invoiceId))) return new NextResponse("Not found", { status: 404 })
    const document = await creditNotePdf(creditNoteId)
    if (!document) return new NextResponse("Not found", { status: 404 })
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline"
    return new NextResponse(new Uint8Array(document.pdf), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `${disposition}; filename="${document.fileName}"`, "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    logger.error("Credit note PDF failed", { error, creditNoteId })
    return new NextResponse("We couldn’t create this credit note. Please try again.", { status: 500 })
  }
}
