import { type NextRequest, NextResponse } from "next/server"
import { OPTION_RESOURCES, type OptionResource } from "@/lib/options"
import { getCurrentUser } from "@/server/auth/session"
import { logger } from "@/server/lib/logger"
import { resolveOptions } from "@/server/modules/options/registry"

const isResource = (value: string): value is OptionResource => (OPTION_RESOURCES as readonly string[]).includes(value)
const NO_STORE = { "Cache-Control": "private, no-store" }

export async function GET(request: NextRequest, context: RouteContext<"/api/options/[resource]">) {
  const { resource } = await context.params
  if (!isResource(resource)) return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE })

  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: NO_STORE })

  const search = request.nextUrl.searchParams
  const query = (search.get("q") ?? "").trim().slice(0, 100)
  const projectId = search.get("projectId") ?? undefined

  try {
    const items = await resolveOptions(resource, query, { projectId }, user)
    if (items === null) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE })
    return NextResponse.json({ items }, { headers: NO_STORE })
  } catch (error) {
    logger.error("Option lookup failed", { error, resource })
    return NextResponse.json({ error: "Could not load options" }, { status: 500, headers: NO_STORE })
  }
}
