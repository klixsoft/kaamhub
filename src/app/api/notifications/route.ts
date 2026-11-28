import { NextResponse } from "next/server"
import { getCurrentUser } from "@/server/auth/session"
import { notificationsFor } from "@/server/modules/notifications/queries"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return NextResponse.json(await notificationsFor(user.id), { headers: { "Cache-Control": "private, no-store" } })
}
