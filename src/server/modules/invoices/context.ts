import "server-only"
import { forbidden, notFound } from "next/navigation"
import { cache } from "react"
import { requireUser } from "@/server/auth/session"
import { isUuid } from "@/server/lib/query"
import { canSeeInvoices } from "./access"
import { getInvoice } from "./queries"

export const loadInvoice = cache(async (invoiceId: string) => {
  const user = await requireUser()
  if (!canSeeInvoices(user)) forbidden()
  if (!isUuid(invoiceId)) notFound()
  const invoice = await getInvoice(user, invoiceId)
  if (!invoice) notFound()
  return { user, invoice }
})
