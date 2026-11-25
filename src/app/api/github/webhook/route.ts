import { verify } from "@octokit/webhooks-methods"
import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/config/env"
import { logger } from "@/server/lib/logger"
import { handleGithubEvent } from "@/server/modules/github/webhooks"
import { isModuleEnabled } from "@/server/modules/settings/queries"

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  if (!env.GITHUB_WEBHOOK_SECRET || !(await isModuleEnabled("github"))) return NextResponse.json({ error: "Webhooks are not configured" }, { status: 404 })

  const signature = request.headers.get("x-hub-signature-256")
  const event = request.headers.get("x-github-event")
  const length = Number(request.headers.get("content-length") ?? 0)
  if (!signature || !event) return NextResponse.json({ error: "Missing headers" }, { status: 400 })
  if (length > MAX_PAYLOAD_BYTES) return NextResponse.json({ error: "Payload too large" }, { status: 413 })

  const payload = await request.text()
  if (!(await verify(env.GITHUB_WEBHOOK_SECRET, payload, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  try {
    await handleGithubEvent(event, JSON.parse(payload))
    return NextResponse.json({ ok: true })
  } catch (error) {
    logger.error("GitHub webhook handling failed", { error, event })
    return NextResponse.json({ error: "Webhook handling failed" }, { status: 500 })
  }
}
