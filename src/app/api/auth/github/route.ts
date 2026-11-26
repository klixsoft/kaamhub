import { NextResponse } from "next/server"
import { env } from "@/config/env"
import { cookieOptions } from "@/server/auth/cookies"
import { getCurrentUser } from "@/server/auth/session"
import { GITHUB_STATE_COOKIE, startGithubAuthorization } from "@/server/modules/github/oauth"
import { isModuleEnabled } from "@/server/modules/settings/queries"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.redirect(new URL("/login?next=/profile", env.APP_URL))
  if (user.role === "client" || !(await isModuleEnabled("github"))) return NextResponse.redirect(new URL("/profile", env.APP_URL))

  const authorization = await startGithubAuthorization(user.id)
  if (!authorization) return NextResponse.redirect(new URL("/profile?github=unavailable", env.APP_URL))

  const response = NextResponse.redirect(authorization.url)
  response.cookies.set(GITHUB_STATE_COOKIE, authorization.cookie, { ...cookieOptions(10 * 60), path: "/api/auth" })
  return response
}
