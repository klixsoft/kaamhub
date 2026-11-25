import { NextResponse } from "next/server"
import { INLINE_DOCUMENT_TYPES } from "@/config/documents"
import { getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { readFile } from "@/server/lib/storage"
import { readableDocument } from "@/server/modules/documents/queries"

function contentDisposition(type: "inline" | "attachment", fileName: string): string {
  const fallback = fileName.replace(/[^\x20-\x7e]|["\\]/g, "_")
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`
}

export async function GET(request: Request, context: RouteContext<"/api/documents/[documentId]">) {
  const { documentId } = await context.params
  const user = await getCurrentUser()
  if (!user) return new NextResponse("Unauthorized", { status: 401 })
  if (!isUuid(documentId)) return new NextResponse("Not found", { status: 404 })

  try {
    const document = await readableDocument(user, documentId)
    if (!document) return new NextResponse("Not found", { status: 404 })
    const file = await readFile(document.storageKey)
    if (!file) {
      logger.error("Document file is missing from storage", { documentId })
      return new NextResponse("Not found", { status: 404 })
    }

    const download = new URL(request.url).searchParams.has("download")
    const inline = !download && INLINE_DOCUMENT_TYPES.has(document.mimeType)
    return new NextResponse(file.stream, {
      headers: {
        "Content-Type": inline ? document.mimeType : "application/octet-stream",
        "Content-Length": String(file.size),
        "Content-Disposition": contentDisposition(inline ? "inline" : "attachment", document.fileName),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    logger.error("Document download failed", { error, documentId })
    return new NextResponse("We couldn’t open this document.", { status: 500 })
  }
}
