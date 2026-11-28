import { NextResponse } from "next/server"
import { DOCUMENT_MAX_BYTES } from "@/config/documents"
import { getCurrentUser } from "@/server/auth/session"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { attachToTask } from "@/server/modules/tasks/attachments"

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function POST(request: Request, context: RouteContext<"/api/tasks/[taskId]/attachments">) {
  const { taskId } = await context.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ ok: false, error: "Your session has expired. Please sign in again." }, { status: 401, headers: NO_STORE })
  if (!isUuid(taskId)) return NextResponse.json({ ok: false, error: "Card was not found." }, { status: 404, headers: NO_STORE })
  if (Number(request.headers.get("content-length") ?? 0) > DOCUMENT_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, error: "This file is too large." }, { status: 413, headers: NO_STORE })
  }

  try {
    const result = await attachToTask(user, taskId, await request.formData())
    return NextResponse.json(result, { status: result.ok ? 201 : 400, headers: NO_STORE })
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ ok: false, error: error.message }, { status: 403, headers: NO_STORE })
    logger.error("Card attachment upload failed", { error, taskId })
    return NextResponse.json({ ok: false, error: "We couldn’t upload this file. Please try again." }, { status: 500, headers: NO_STORE })
  }
}
