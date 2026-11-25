import { NextResponse } from "next/server"
import { DOCUMENT_MAX_BYTES } from "@/config/documents"
import { getCurrentUser } from "@/server/auth/session"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { uploadProjectDocument } from "@/server/modules/documents/upload"

const NO_STORE = { "Cache-Control": "private, no-store" }
const MULTIPART_OVERHEAD_BYTES = 64 * 1024

export async function POST(request: Request, context: RouteContext<"/api/projects/[projectId]/documents">) {
  const { projectId } = await context.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false, error: "Your session has expired. Please sign in again." }, { status: 401, headers: NO_STORE })
  if (!isUuid(projectId)) return NextResponse.json({ ok: false, error: "Project was not found." }, { status: 404, headers: NO_STORE })

  const declaredLength = Number(request.headers.get("content-length") ?? 0)
  if (declaredLength > DOCUMENT_MAX_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ ok: false, error: "This file is too large." }, { status: 413, headers: NO_STORE })
  }

  try {
    const result = await uploadProjectDocument(user, projectId, await request.formData())
    return NextResponse.json(result, { status: result.ok ? 201 : 400, headers: NO_STORE })
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ ok: false, error: error.message }, { status: 403, headers: NO_STORE })
    logger.error("Document upload failed", { error, projectId })
    return NextResponse.json({ ok: false, error: "We couldn’t upload this file. Please try again." }, { status: 500, headers: NO_STORE })
  }
}
