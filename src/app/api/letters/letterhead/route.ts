import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { LETTERHEAD_MAX_BYTES, LETTERHEAD_TYPES } from "@/config/letters"
import { can, getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { readFile, saveFile } from "@/server/lib/storage"
import { getSettings } from "@/server/modules/settings/queries"
import { saveSettings } from "@/server/modules/settings/service"
import { recordAudit } from "@/server/services/audit"

const NO_STORE = { "Cache-Control": "private, no-store" }

function isImage(bytes: Uint8Array, extension: string): boolean {
  if (extension === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user || !can(user, "letters:manage")) return NextResponse.json({ ok: false, error: "You do not have permission to do this." }, { status: 403, headers: NO_STORE })
  if (Number(request.headers.get("content-length") ?? 0) > LETTERHEAD_MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ ok: false, error: "The image can be up to 5 MB." }, { status: 413, headers: NO_STORE })
  }

  try {
    const file = (await request.formData()).get("file")
    if (!(file instanceof File) || file.size === 0) return NextResponse.json({ ok: false, error: "Choose an image." }, { status: 400, headers: NO_STORE })
    const extension = file.name.split(".").pop()?.toLowerCase() ?? ""
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!(extension in LETTERHEAD_TYPES) || !isImage(bytes, extension === "png" ? "png" : "jpg")) {
      return NextResponse.json({ ok: false, error: "Use a PNG or JPG image." }, { status: 400, headers: NO_STORE })
    }
    if (file.size > LETTERHEAD_MAX_BYTES) return NextResponse.json({ ok: false, error: "The image can be up to 5 MB." }, { status: 413, headers: NO_STORE })

    /* Old letterheads are kept: letters issued earlier still print with the one they were issued on. */
    const key = `letterheads/${randomUUID()}.${extension === "png" ? "png" : "jpg"}`
    await saveFile(key, bytes)
    const current = await getSettings("letters")
    await saveSettings("letters", { ...current, letterheadKey: key }, { from: "route" })
    await recordAudit({ actorId: user.id, action: "settings.letterhead_uploaded", entityType: "settings", entityId: "letters" })
    return NextResponse.json({ ok: true, data: { key } }, { headers: NO_STORE })
  } catch (error) {
    logger.error("Letterhead upload failed", { error })
    return NextResponse.json({ ok: false, error: "We couldn’t save the image. Please try again." }, { status: 500, headers: NO_STORE })
  }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user || !can(user, "letters:manage")) return new NextResponse("Not found", { status: 404 })
  const { letterheadKey } = await getSettings("letters")
  const file = letterheadKey ? await readFile(letterheadKey) : null
  if (!file) return new NextResponse("Not found", { status: 404 })
  return new NextResponse(file.stream, {
    headers: { "Content-Type": LETTERHEAD_TYPES[letterheadKey.endsWith(".png") ? "png" : "jpg"], "Content-Length": String(file.size), ...NO_STORE },
  })
}
