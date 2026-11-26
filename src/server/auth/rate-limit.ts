import "server-only"
import { sql } from "drizzle-orm"
import { db } from "@/server/db"
import { authRateLimits } from "@/server/db/schema"

export async function consumeRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const window = sql`make_interval(secs => ${windowSeconds})`
  const [row] = await db
    .insert(authRateLimits)
    .values({ key, count: 1, resetAt: sql`now() + ${window}` })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`case when ${authRateLimits.resetAt} <= now() then 1 else ${authRateLimits.count} + 1 end`,
        resetAt: sql`case when ${authRateLimits.resetAt} <= now() then now() + ${window} else ${authRateLimits.resetAt} end`,
      },
    })
    .returning({ count: authRateLimits.count })
  return (row?.count ?? 1) <= limit
}
