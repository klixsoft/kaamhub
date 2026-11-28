import { NextResponse } from "next/server"
import { can, getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { letterFileName, renderLetterPdf } from "@/server/modules/letters/pdf"
import { getLetter } from "@/server/modules/letters/queries"

export async function GET(request: Request, context: RouteContext<"/api/letters/[letterId]/pdf">) {
  const { letterId } = await context.params
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  if (!isUuid(letterId)) return new NextResponse("Not found", { status: 404 })

  try {
    const letter = await getLetter(letterId)
    const manager = can(user, "letters:manage")
    if (!letter || (!manager && (letter.recipientId !== user.id || letter.revokedAt))) return new NextResponse("Not found", { status: 404 })
    const pdf = await renderLetterPdf({ ...letter, revoked: Boolean(letter.revokedAt) })
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline"
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${letterFileName(letter)}"`,
        "Cache-Control": "private, no-store",
      },
    })
  } catch (error) {
    logger.error("Letter PDF failed", { error, letterId })
    return new NextResponse("We couldn’t create this letter. Please try again.", { status: 500 })
  }
}
