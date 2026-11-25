import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { env } from "@/config/env"
import { logger } from "@/server/lib/logger"
import { runDailyJobs } from "@/server/modules/jobs/daily"

function authorized(header: string | null): boolean {
  if (!env.CRON_SECRET || !header) return false
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`)
  const received = Buffer.from(header)
  return expected.length === received.length && timingSafeEqual(expected, received)
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
