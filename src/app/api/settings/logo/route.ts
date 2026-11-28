import { NextResponse } from "next/server"
import { can, getCurrentUser } from "@/server/auth/session"
import { receiveImage, serveImage } from "@/server/lib/image-upload"
import { logger } from "@/server/lib/logger"
import { getSettings } from "@/server/modules/settings/queries"
import { saveSettings } from "@/server/modules/settings/service"
import { recordAudit } from "@/server/services/audit"

const NO_STORE = { "Cache-Control": "private, no-store" }
const LOGO_MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !can(user, "settings:manage")) return NextResponse.json({ ok: false, error: "You do not have permission to do this." }, { status: 403, headers: NO_STORE })

  try {
    const upload = await receiveImage(request, { folder: "branding", maxBytes: LOGO_MAX_BYTES })
    if (!upload.ok) return NextResponse.json({ ok: false, error: upload.error }, { status: upload.status, headers: NO_STORE })
    await saveSettings("branding", { logoKey: upload.key }, { from: "route" })
    await recordAudit({ actorId: user.id, action: "settings.logo_uploaded", entityType: "settings", entityId: "branding" })
    return NextResponse.json({ ok: true, data: { key: upload.key } }, { headers: NO_STORE })
  } catch (error) {
    logger.error("Logo upload failed", { error })
    return NextResponse.json({ ok: false, error: "We couldn’t save the image. Please try again." }, { status: 500, headers: NO_STORE })
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !can(user, "settings:manage")) return new NextResponse("Not found", { status: 404 })
  return serveImage((await getSettings("branding")).logoKey)
}
