import "server-only"
import { count } from "drizzle-orm"
import { connection } from "next/server"
import { db } from "@/server/db"
import { users } from "@/server/db/schema"

export async function isSetupRequired(): Promise<boolean> {
  await connection()
  const [row] = await db.select({ total: count() }).from(users)
  return (row?.total ?? 0) === 0
}
