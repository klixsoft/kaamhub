import "server-only"
import { and, asc, count, desc, eq, type SQL, sql } from "drizzle-orm"
import { INVOICE_STATUS_LABELS, INVOICE_STATUSES } from "@/config/finance"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { clients, creditNotes, invoiceItems, invoicePayments, invoiceTaxes, invoices, projects, users } from "@/server/db/schema"
import { facetCounts, filterIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"
import { invoiceVisibilityCondition } from "./access"

export const INVOICE_LIST_CONFIG = {
  filters: ["status"] as const,
  sorts: ["issueDate", "dueDate", "total", "number"] as const,
  defaultSort: { id: "issueDate" as const, desc: true },
}

export type InvoiceListParams = ListParams<(typeof INVOICE_LIST_CONFIG.filters)[number], (typeof INVOICE_LIST_CONFIG.sorts)[number]>

function invoiceConditions(user: CurrentUser, params: InvoiceListParams, exclude?: "status") {
  return and(
    invoiceVisibilityCondition(user),
    searchAcross(params.q, [invoices.number, invoices.buyerName, clients.name]),
    exclude === "status" ? undefined : filterIn(invoices.status, params.filters.status, INVOICE_STATUSES),
  )
}

export async function listInvoices(user: CurrentUser, params: InvoiceListParams) {
  const window = pageWindow(params)
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      status: invoices.status,
      clientName: clients.name,
      projectName: projects.name,
      currency: invoices.currency,
      issueDate: invoices.issueDate,
      dueDate: invoices.dueDate,
      total: invoices.total,
      amountPaid: invoices.amountPaid,
      fromService: sql<boolean>`${invoices.serviceId} is not null`,
      total_count: totalCount,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(invoiceConditions(user, params))
    .orderBy(
      ...orderFrom(
        params.sort,
        { issueDate: invoices.issueDate, dueDate: invoices.dueDate, total: invoices.total, number: invoices.number },
        invoices.id,
      ),
    )
    .limit(window.limit)
    .offset(window.offset)

  return toPageResult(
    rows.map(({ total_count: _count, ...row }) => row),
    rows[0]?.total_count ?? 0,
    params,
  )
}

export type InvoiceRow = Awaited<ReturnType<typeof listInvoices>> extends PageResult<infer TRow> ? TRow : never

export async function invoiceFacets(user: CurrentUser, params: InvoiceListParams): Promise<Facet[]> {
  const statusCounts = facetCounts(
    await db
      .select({ value: invoices.status, count: count() })
      .from(invoices)
      .innerJoin(clients, eq(clients.id, invoices.clientId))
      .where(invoiceConditions(user, params, "status"))
      .groupBy(invoices.status),
  )
  const visibleStatuses = user.role === "client" ? INVOICE_STATUSES.filter((status) => status !== "draft") : INVOICE_STATUSES
  return [
    {
      key: "status",
      title: "Status",
      options: visibleStatuses.map((status) => ({ value: status, label: INVOICE_STATUS_LABELS[status], count: statusCounts.get(status) ?? 0 })),
    },
  ]
}

export async function getInvoice(user: CurrentUser, invoiceId: string) {
  return fetchInvoice(invoiceId, invoiceVisibilityCondition(user))
}

export async function fetchInvoice(invoiceId: string, visibility?: SQL) {
  const [invoice] = await db
    .select({
      invoice: invoices,
      clientName: clients.name,
      clientEmail: clients.email,
      projectName: projects.name,
      projectCode: projects.code,
    })
    .from(invoices)
    .innerJoin(clients, eq(clients.id, invoices.clientId))
    .leftJoin(projects, eq(projects.id, invoices.projectId))
    .where(and(eq(invoices.id, invoiceId), visibility))
    .limit(1)
  if (!invoice) return null

  const [items, taxes, payments, credits] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId)).orderBy(asc(invoiceItems.position)),
    db
      .select({ name: invoiceTaxes.name, kind: invoiceTaxes.kind, rate: invoiceTaxes.rate, amount: invoiceTaxes.amount })
      .from(invoiceTaxes)
      .where(eq(invoiceTaxes.invoiceId, invoiceId))
      .orderBy(asc(invoiceTaxes.position)),
    db
      .select({
        id: invoicePayments.id,
        paidOn: invoicePayments.paidOn,
        amount: invoicePayments.amount,
        method: invoicePayments.method,
        reference: invoicePayments.reference,
        note: invoicePayments.note,
        recordedBy: users.name,
      })
      .from(invoicePayments)
      .leftJoin(users, eq(users.id, invoicePayments.recordedById))
      .where(eq(invoicePayments.invoiceId, invoiceId))
      .orderBy(desc(invoicePayments.paidOn)),
    db
      .select({ id: creditNotes.id, number: creditNotes.number, issueDate: creditNotes.issueDate, reason: creditNotes.reason, total: creditNotes.total })
      .from(creditNotes)
      .where(eq(creditNotes.invoiceId, invoiceId))
      .orderBy(desc(creditNotes.issueDate), desc(creditNotes.createdAt)),
  ])

  return {
    ...invoice.invoice,
    clientName: invoice.clientName,
    clientEmail: invoice.clientEmail,
    projectName: invoice.projectName,
    projectCode: invoice.projectCode,
    items,
    taxes,
    payments,
    creditNotes: credits,
  }
}

export type InvoiceDetail = NonNullable<Awaited<ReturnType<typeof getInvoice>>>
