import "server-only"
import { and, eq } from "drizzle-orm"
import { after } from "next/server"
import { db } from "@/server/db"
import { accounts, users } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import { syncUserGithubAccess } from "./access-sync"
import { fetchGithubLogin } from "./client"

export async function linkGithubLogin(userId: string, accessToken: string): Promise<void> {
  try {
    const login = await fetchGithubLogin(accessToken)
    if (!login) return
    await db.update(users).set({ githubUsername: login }).where(eq(users.id, userId))
    after(() => syncUserGithubAccess(userId))
  } catch (error) {
    logger.error("Failed to resolve GitHub login", { error, userId })
  }
}

export async function unlinkGithubAccount(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(accounts).where(and(eq(accounts.userId, userId), eq(accounts.providerId, "github")))
    await tx.update(users).set({ githubUsername: null }).where(eq(users.id, userId))
  })
  await syncUserGithubAccess(userId)
}
