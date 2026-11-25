import "server-only"
import { sql } from "drizzle-orm"
import type { Transaction } from "@/server/db"
import { invoiceSequences } from "@/server/db/schema"
import { fiscalYearOf } from "@/lib/nepali-date"

export async function allocateInvoiceNumber(tx: Transaction, issueDate: string): Promise<{ number: string; fiscalYear: string }> {
  const fiscalYear = fiscalYearOf(issueDate)
  const [row] = await tx
    .insert(invoiceSequences)
    .values({ fiscalYear, lastNumber: 1 })
    .onConflictDoUpdate({ target: invoiceSequences.fiscalYear, set: { lastNumber: sql`${invoiceSequences.lastNumber} + 1` } })
    .returning({ value: invoiceSequences.lastNumber })
  if (!row) throw new Error("Invoice sequence allocation returned no row")
  return { number: `${fiscalYear}-${String(row.value).padStart(4, "0")}`, fiscalYear }
}
