import "server-only"
import { sql } from "drizzle-orm"
import type { Transaction } from "@/server/db"
import { invoiceSequences } from "@/server/db/schema"
import { type FiscalYearRule, fiscalYearLabel } from "@/lib/fiscal-year"

export async function allocateInvoiceNumber(
  tx: Transaction,
  issueDate: string,
  rule: FiscalYearRule & { prefix: string },
): Promise<{ number: string; fiscalYear: string }> {
  const fiscalYear = fiscalYearLabel(issueDate, rule)
  const [row] = await tx
    .insert(invoiceSequences)
    .values({ fiscalYear, lastNumber: 1 })
    .onConflictDoUpdate({ target: invoiceSequences.fiscalYear, set: { lastNumber: sql`${invoiceSequences.lastNumber} + 1` } })
    .returning({ value: invoiceSequences.lastNumber })
  if (!row) throw new Error("Invoice sequence allocation returned no row")
  return { number: `${rule.prefix}${fiscalYear}-${String(row.value).padStart(4, "0")}`, fiscalYear }
}
