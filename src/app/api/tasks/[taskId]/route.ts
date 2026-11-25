import { NextResponse } from "next/server"
import { getCurrentUser } from "@/server/auth/session"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { isUuid } from "@/server/lib/query"
import { getTaskDetail } from "@/server/modules/tasks/queries"

const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(_request: Request, context: RouteContext<"/api/tasks/[taskId]">) {
  const { taskId } = await context.params
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })
  if (!isUuid(taskId)) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE })

  try {
    const detail = await getTaskDetail(user, taskId)
    if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE })
    return NextResponse.json(detail, { headers: NO_STORE })
  } catch (error) {
    if (error instanceof AppError) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE })
    logger.error("Task detail failed", { error, taskId })
    return NextResponse.json({ error: "Could not load the task" }, { status: 500, headers: NO_STORE })
  }
}
