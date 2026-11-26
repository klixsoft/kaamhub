import { type NextRequest, NextResponse } from "next/server"
import { ACCESS_COOKIE, ACCESS_TTL_SECONDS, cookieOptions, readAccess, REFRESH_COOKIE, SESSION_IDLE_SECONDS } from "@/server/auth/cookies"
import { clientMeta, rotateSession } from "@/server/auth/session-store"

const PUBLIC_PAGES = ["/login", "/setup", "/forgot-password", "/reset-password"]

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGES.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

function loginRedirect(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl
  const loginUrl = new URL("/login", request.url)
  if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isApi = pathname.startsWith("/api/")
  const protectedPage = !isApi && !isPublicPage(pathname)

  if (await readAccess(request.cookies.get(ACCESS_COOKIE)?.value)) return NextResponse.next()

  const refreshCookie = request.cookies.get(REFRESH_COOKIE)?.value
  if (!refreshCookie) return protectedPage ? loginRedirect(request) : NextResponse.next()

  const tokens = await rotateSession(refreshCookie, clientMeta(request.headers))
  if (!tokens) {
    const response = protectedPage ? loginRedirect(request) : NextResponse.next()
    response.cookies.delete(ACCESS_COOKIE)
    response.cookies.delete(REFRESH_COOKIE)
    return response
  }

  request.cookies.set(ACCESS_COOKIE, tokens.access)
  const response = NextResponse.next({ request: { headers: request.headers } })
  response.cookies.set(ACCESS_COOKIE, tokens.access, cookieOptions(ACCESS_TTL_SECONDS))
  if (tokens.refresh) response.cookies.set(REFRESH_COOKIE, tokens.refresh, cookieOptions(SESSION_IDLE_SECONDS))
  return response
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|api/health|api/cron|api/github/webhook|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
}
