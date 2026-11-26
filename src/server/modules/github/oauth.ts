import "server-only"
import { sealData, unsealData } from "iron-session"
import { env } from "@/config/env"
import { randomToken, safeEqual } from "@/server/auth/tokens"
import { getGithubOAuthConfig } from "@/server/modules/integrations/config"

export const GITHUB_STATE_COOKIE = "kh_github_state"
const STATE_TTL_SECONDS = 10 * 60

export const githubCallbackUrl = () => `${env.APP_URL}/api/auth/callback/github`

interface OAuthState {
  state: string
  userId: string
}

export async function startGithubAuthorization(userId: string): Promise<{ url: string; cookie: string } | null> {
  const config = await getGithubOAuthConfig()
  if (!config) return null
  const state = randomToken(24)
  const url = new URL("https://github.com/login/oauth/authorize")
  url.searchParams.set("client_id", config.clientId)
  url.searchParams.set("redirect_uri", githubCallbackUrl())
  url.searchParams.set("state", state)
  url.searchParams.set("allow_signup", "false")
  return { url: url.toString(), cookie: await sealData({ state, userId } satisfies OAuthState, { password: env.SESSION_SECRET, ttl: STATE_TTL_SECONDS }) }
}

export async function verifyGithubState(cookieValue: string | undefined, state: string | null, userId: string): Promise<boolean> {
  if (!cookieValue || !state) return false
  try {
    const saved = await unsealData<Partial<OAuthState>>(cookieValue, { password: env.SESSION_SECRET, ttl: STATE_TTL_SECONDS })
    return typeof saved.state === "string" && safeEqual(saved.state, state) && saved.userId === userId
  } catch {
    return false
  }
}

export async function exchangeGithubCode(code: string): Promise<string | null> {
  const config = await getGithubOAuthConfig()
  if (!config) return null
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "User-Agent": "kaamhub" },
    body: JSON.stringify({ client_id: config.clientId, client_secret: config.clientSecret, code, redirect_uri: githubCallbackUrl() }),
    cache: "no-store",
  })
  if (!response.ok) return null
  const body = (await response.json()) as { access_token?: unknown }
  return typeof body.access_token === "string" ? body.access_token : null
}
