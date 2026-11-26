import "server-only"
import { and, eq, ne } from "drizzle-orm"
import { after } from "next/server"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"
import { AppError } from "@/server/lib/errors"
import { syncUserGithubAccess } from "./access-sync"
import type { GithubIdentity } from "./client"

export async function linkGithubIdentity(userId: string, identity: GithubIdentity): Promise<void> {
  const [taken] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.githubUserId, identity.id), ne(users.id, userId)))
    .limit(1)
  if (taken) throw new AppError("This GitHub account is already connected to another person.", "CONFLICT")
  await db.update(users).set({ githubUserId: identity.id, githubUsername: identity.login }).where(eq(users.id, userId))
  after(() => syncUserGithubAccess(userId))
}

export async function unlinkGithubAccount(userId: string): Promise<void> {
  await db.update(users).set({ githubUserId: null, githubUsername: null }).where(eq(users.id, userId))
  await syncUserGithubAccess(userId)
}
