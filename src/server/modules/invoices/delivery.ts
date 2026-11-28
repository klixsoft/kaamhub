import "server-only"
import { and, eq } from "drizzle-orm"
import { formatDate } from "@/lib/format"
import { balanceDue } from "@/lib/invoice-math"
import { formatMoney } from "@/lib/money"
import { db } from "@/server/db"
import { clientContacts, users } from "@/server/db/schema"
import { AppError, notFoundError } from "@/server/lib/errors"
import { getSettings } from "@/server/modules/settings/queries"
import { sendMail } from "@/server/services/mailer"
import { invoiceFileName, renderInvoicePdf } from "./pdf"
import { fetchInvoice } from "./queries"
import { toInvoiceView } from "./view"

export async function recipientsFor(clientId: string, clientEmail: string | null): Promise<string[]> {
  const contacts = await db
    .select({ email: users.email })
    .from(clientContacts)
    .innerJoin(users, eq(users.id, clientContacts.userId))
    .where(and(eq(clientContacts.clientId, clientId), eq(users.status, "active")))
  return [...new Set([clientEmail, ...contacts.map((contact) => contact.email)].filter((email): email is string => Boolean(email)))]
}

export async function deliverInvoice(invoiceId: string): Promise<{ recipients: number }> {
  const [invoice, billing] = await Promise.all([fetchInvoice(invoiceId), getSettings("billing")])
  if (!invoice) throw notFoundError("Invoice")
  if (invoice.status === "draft" || invoice.status === "cancelled") throw new AppError("Only issued invoices can be sent.")

  const recipients = await recipientsFor(invoice.clientId, invoice.clientEmail)
  if (recipients.length === 0) throw new AppError("This client has no email address or portal contacts.")

  const view = toInvoiceView(invoice, billing)
  const pdf = await renderInvoicePdf(view)
  const balance = formatMoney(balanceDue(invoice), invoice.currency)

  await sendMail({
    to: recipients,
    subject: `Invoice ${invoice.number} from ${view.seller.name}`,
    text: [
      `Dear ${invoice.buyerName},`,
      "",
      `Please find attached invoice ${invoice.number} dated ${formatDate(invoice.issueDate)}.`,
      `Amount due: ${balance}${invoice.dueDate ? `, due by ${formatDate(invoice.dueDate)}` : ""}.`,
      billing.bankDetails ? `\nPayment details:\n${billing.bankDetails}` : "",
      "",
      `Regards,\n${view.seller.name}`,
    ].join("\n"),
    attachments: [{ filename: invoiceFileName(view), content: pdf, contentType: "application/pdf" }],
  })
  return { recipients: recipients.length }
}
