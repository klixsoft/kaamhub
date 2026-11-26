import { sealData, unsealData } from "iron-session"
import { env } from "@/config/env"

export const ACCESS_TTL_SECONDS = 15 * 60
export const SESSION_IDLE_SECONDS = 30 * 24 * 60 * 60
export const SESSION_MAX_SECONDS = 90 * 24 * 60 * 60

const secure = env.APP_URL.startsWith("https://")

export const ACCESS_COOKIE = secure ? "__Host-kh_session" : "kh_session"
export const REFRESH_COOKIE = secure ? "__Host-kh_refresh" : "kh_refresh"

export interface AccessClaims {
  sid: string
  uid: string
}

export interface CookieOptions {
  httpOnly: true
  secure: boolean
  sameSite: "lax"
  path: "/"
  maxAge: number
}

export function cookieOptions(maxAge: number): CookieOptions {
  return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge }
}

export function sealAccess(claims: AccessClaims): Promise<string> {
  return sealData(claims, { password: env.SESSION_SECRET, ttl: ACCESS_TTL_SECONDS })
}

export async function readAccess(value: string | undefined): Promise<AccessClaims | null> {
  if (!value) return null
  try {
    const data = await unsealData<Partial<AccessClaims>>(value, { password: env.SESSION_SECRET, ttl: ACCESS_TTL_SECONDS })
    return typeof data.sid === "string" && typeof data.uid === "string" ? { sid: data.sid, uid: data.uid } : null
  } catch {
    return null
  }
}

export function refreshCookieValue(sessionId: string, token: string): string {
  return `${sessionId}.${token}`
}

export function parseRefreshCookie(value: string | undefined): { sessionId: string; token: string } | null {
  if (!value) return null
  const separator = value.indexOf(".")
  if (separator <= 0) return null
  const sessionId = value.slice(0, separator)
  const token = value.slice(separator + 1)
  return /^[0-9a-f-]{36}$/.test(sessionId) && token.length >= 32 ? { sessionId, token } : null
}
