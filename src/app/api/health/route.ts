import { sql } from "drizzle-orm"
import { NextResponse } from "next/server"
import { env } from "@/config/env"
import { db } from "@/server/db"

export async function GET() {
  try {
    await db.execute(sql`select 1`)
    return NextResponse.json({ status: "ok", version: env.APP_VERSION }, { headers: { "Cache-Control": "no-store" } })
  } catch {
    return NextResponse.json({ status: "error", version: env.APP_VERSION }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
