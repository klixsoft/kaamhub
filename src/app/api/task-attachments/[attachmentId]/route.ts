import { NextResponse } from "next/server"
import { INLINE_DOCUMENT_TYPES } from "@/config/documents"
import { getCurrentUser } from "@/server/auth/session"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { readFile } from "@/server/lib/storage"
import { readableAttachment } from "@/server/modules/tasks/attachments"

export async function GET(request: Request, context: RouteContext<"/api/task-attachments/[attachmentId]">) {
  const { attachmentId } = await context.params
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  if (!isUuid(attachmentId)) return new NextResponse("Not found", { status: 404 })

  try {
    const attachment = await readableAttachment(user, attachmentId)
    const file = attachment ? await readFile(attachment.storageKey) : null
    if (!attachment || !file) return new NextResponse("Not found", { status: 404 })
    const inline = !new URL(request.url).searchParams.has("download") && INLINE_DOCUMENT_TYPES.has(attachment.mimeType)
    return new NextResponse(file.stream, {
      headers: {
        "Content-Type": inline ? attachment.mimeType : "application/octet-stream",
        "Content-Length": String(file.size),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${attachment.fileName.replace(/[^\x20-\x7e]|["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    if (error instanceof AppError) return new NextResponse("Not found", { status: 404 })
    logger.error("Card attachment download failed", { error, attachmentId })
    return new NextResponse("We couldn’t open this file.", { status: 500 })
  }
}
