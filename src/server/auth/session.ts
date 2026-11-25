import "server-only"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { forbidden, redirect } from "next/navigation"
import { connection } from "next/server"
import { cache } from "react"
import type { UserStatus } from "@/config/domain"
import { type Permission, roleHasPermission, type SystemRole } from "@/config/roles"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { isUserAccessAllowed } from "./access"
import { auth } from "./auth"

export interface CurrentUser {
  id: string
  name: string
  email: string
  image: string | null
  role: SystemRole
  status: UserStatus
  githubUsername: string | null
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  await connection()
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  const [user] = await db
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
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!user || !isUserAccessAllowed(user)) return null
  const { accessExpiresAt: _accessExpiresAt, ...currentUser } = user
  return currentUser
})

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
