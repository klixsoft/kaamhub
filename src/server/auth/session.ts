import "server-only"
import { and, eq, gt, isNull, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { forbidden, redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"
import type { UserStatus } from "@/config/domain"
import { type Permission, roleHasPermission, type SystemRole } from "@/config/roles"
import { db } from "@/server/db"
import { userSessions, users } from "@/server/db/schema"
import { isUserAccessAllowed } from "./access"
import { ACCESS_COOKIE, readAccess } from "./cookies"

export interface CurrentUser {
  id: string
  name: string
  email: string
  image: string | null
  role: SystemRole
  status: UserStatus
  githubUsername: string | null
}

export interface CurrentSession {
  user: CurrentUser
  sessionId: string
}

export const getCurrentSession = cache(async (): Promise<CurrentSession | null> => {
  await connection()
  const claims = await readAccess((await cookies()).get(ACCESS_COOKIE)?.value)
  if (!claims) return null

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      status: users.status,
      accessExpiresAt: users.accessExpiresAt,
      githubUsername: users.githubUsername,
    })
    .from(userSessions)
    .innerJoin(users, eq(users.id, userSessions.userId))
    .where(
      and(
        eq(userSessions.id, claims.sid),
        eq(userSessions.userId, claims.uid),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, sql`now()`),
      ),
    )
    .limit(1)

  if (!row || !isUserAccessAllowed(row)) return null
  const { accessExpiresAt: _accessExpiresAt, ...user } = row
  return { user, sessionId: claims.sid }
})

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return (await getCurrentSession())?.user ?? null
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export function can(user: Pick<CurrentUser, "role">, permission: Permission): boolean {
  return roleHasPermission(user.role, permission)
}

export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser()
  if (!can(user, permission)) forbidden()
  return user
}
