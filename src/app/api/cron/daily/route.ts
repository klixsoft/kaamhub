import { NextResponse } from "next/server"
import { env } from "@/config/env"
import { internalToken, safeEqual } from "@/server/auth/tokens"
import { logger } from "@/server/lib/logger"
import { runDailyJobs } from "@/server/modules/jobs/daily"

function authorized(header: string | null): boolean {
  if (!header) return false
  const accepted = [internalToken("cron"), env.CRON_SECRET].filter((secret): secret is string => Boolean(secret))
  return accepted.some((secret) => safeEqual(header, `Bearer ${secret}`))
}

export async function POST(request: Request) {
  if (!authorized(request.headers.get("authorization"))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    return NextResponse.json(await runDailyJobs())
  } catch (error) {
    logger.error("Daily jobs failed", { error })
    return NextResponse.json({ error: "Daily jobs failed" }, { status: 500 })
  }
}
