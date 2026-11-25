import "server-only"
import { and, eq, exists, ne, type SQL, sql } from "drizzle-orm"
import { type CurrentUser, can } from "@/server/auth/session"
import { db } from "@/server/db"
import { clientContacts, invoices } from "@/server/db/schema"

export function invoiceVisibilityCondition(user: CurrentUser): SQL | undefined {
  if (can(user, "finance:read")) return undefined
  if (user.role === "client") {
    return and(
      ne(invoices.status, "draft"),
      exists(
        db
          .select({ one: clientContacts.userId })
          .from(clientContacts)
          .where(and(eq(clientContacts.clientId, invoices.clientId), eq(clientContacts.userId, user.id))),
      ),
    )
  }
  return sql`false`
}

export function canSeeInvoices(user: CurrentUser): boolean {
  return can(user, "finance:read") || user.role === "client"
}
