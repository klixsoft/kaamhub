import { NextResponse } from "next/server"
import { can, getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { getUpdaterStatus } from "@/server/modules/system/updater"

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !can(user, "system:update")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  try {
    return NextResponse.json({ status: await getUpdaterStatus() }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) {
    logger.warn("Updater status unavailable", { error })
    return NextResponse.json({ status: null, unreachable: true }, { headers: { "Cache-Control": "no-store" } })
  }
}
