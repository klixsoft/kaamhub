import { type NextRequest, NextResponse } from "next/server"
import { env } from "@/config/env"
import { getCurrentUser } from "@/server/auth/session"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { linkGithubIdentity } from "@/server/modules/github/account-link"
import { fetchGithubIdentity } from "@/server/modules/github/client"
import { exchangeGithubCode, GITHUB_STATE_COOKIE, verifyGithubState } from "@/server/modules/github/oauth"
import { recordAudit } from "@/server/services/audit"

function backToProfile(result: string) {
  const response = NextResponse.redirect(new URL(`/profile?github=${result}`, env.APP_URL))
  response.cookies.delete({ name: GITHUB_STATE_COOKIE, path: "/api/auth" })
  return response
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/login?next=/profile", env.APP_URL))

  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  if (!code || !(await verifyGithubState(request.cookies.get(GITHUB_STATE_COOKIE)?.value, searchParams.get("state"), user.id))) {
    return backToProfile("failed")
  }

  try {
    const accessToken = await exchangeGithubCode(code)
    const identity = accessToken ? await fetchGithubIdentity(accessToken) : null
    if (!identity) return backToProfile("failed")
    await linkGithubIdentity(user.id, identity)
    await recordAudit({ actorId: user.id, action: "profile.github_connected", entityType: "user", entityId: user.id, metadata: { login: identity.login } })
    return backToProfile("connected")
  } catch (error) {
    if (error instanceof AppError && error.code === "CONFLICT") return backToProfile("taken")
    logger.error("GitHub connection failed", { error, userId: user.id })
    return backToProfile("failed")
  }
}
