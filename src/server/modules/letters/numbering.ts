import "server-only"
import { sql } from "drizzle-orm"
import type { Transaction } from "@/server/db"
import { letterSequences } from "@/server/db/schema"

export async function allocateLetterNumber(tx: Transaction, letterDate: string, prefix: string): Promise<string> {
  const year = letterDate.slice(0, 4)
  const [row] = await tx
    .insert(letterSequences)
    .values({ year, lastNumber: 1 })
    .onConflictDoUpdate({ target: letterSequences.year, set: { lastNumber: sql`${letterSequences.lastNumber} + 1` } })
    .returning({ value: letterSequences.lastNumber })
  if (!row) throw new Error("Letter sequence allocation returned no row")
  return `${prefix}${year}-${String(row.value).padStart(4, "0")}`
}
