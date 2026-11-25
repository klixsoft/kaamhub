import { date, index, integer, jsonb, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import type { CurrencyFormat, InvoiceFormat } from "@/config/finance"
import { users } from "./auth"
import { clients } from "./clients"
import {
  billingCycleEnum,
  invoiceStatusEnum,
  paymentMethodEnum,
  serviceStatusEnum,
  serviceTypeEnum,
  taxKindEnum,
} from "./enums"
import { id, timestamps } from "./helpers"
import { projects } from "./projects"

const money = (name: string) => numeric(name, { precision: 14, scale: 2, mode: "number" })

export const managedServices = pgTable(
  "managed_service",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    type: serviceTypeEnum("type").notNull(),
    name: text("name").notNull(),
    provider: text("provider"),
    status: serviceStatusEnum("status").notNull().default("active"),
    startedOn: date("started_on"),
    expiresOn: date("expires_on"),
    billingCycle: billingCycleEnum("billing_cycle").notNull(),
    amount: money("amount").notNull(),
    nextBillingOn: date("next_billing_on").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("managed_service_project_idx").on(table.projectId),
    index("managed_service_billing_idx").on(table.status, table.nextBillingOn),
    index("managed_service_expiry_idx").on(table.status, table.expiresOn),
  ],
)

export const invoiceSequences = pgTable("invoice_sequence", {
  fiscalYear: text("fiscal_year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
})

export const invoices = pgTable(
  "invoice",
  {
    id: id(),
    number: text("number"),
    fiscalYear: text("fiscal_year"),
    status: invoiceStatusEnum("status").notNull().default("draft"),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    serviceId: uuid("service_id").references(() => managedServices.id, { onDelete: "set null" }),
    servicePeriodStart: date("service_period_start"),
    currency: jsonb("currency").$type<CurrencyFormat>().notNull(),
    format: jsonb("format").$type<InvoiceFormat>(),
    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date"),
    sellerName: text("seller_name"),
    sellerAddress: text("seller_address"),
    sellerTaxNumber: text("seller_tax_number"),
    sellerContact: text("seller_contact"),
    buyerName: text("buyer_name").notNull(),
    buyerAddress: text("buyer_address"),
    buyerTaxNumber: text("buyer_tax_number"),
    subtotal: money("subtotal").notNull().default(0),
    discount: money("discount").notNull().default(0),
    taxableAmount: money("taxable_amount").notNull().default(0),
    taxAmount: money("tax_amount").notNull().default(0),
    total: money("total").notNull().default(0),
    amountPaid: money("amount_paid").notNull().default(0),
    notes: text("notes"),
    issuedAt: timestamp("issued_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invoice_number_idx").on(table.number),
    uniqueIndex("invoice_service_period_idx").on(table.serviceId, table.servicePeriodStart),
    index("invoice_client_idx").on(table.clientId),
    index("invoice_project_idx").on(table.projectId),
    index("invoice_status_idx").on(table.status, table.issueDate),
  ],
)

export const invoiceItems = pgTable(
  "invoice_item",
  {
    id: id(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    description: text("description").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 2, mode: "number" }).notNull(),
    unit: text("unit"),
    rate: money("rate").notNull(),
    amount: money("amount").notNull(),
  },
  (table) => [index("invoice_item_invoice_idx").on(table.invoiceId, table.position)],
)

export const invoiceTaxes = pgTable(
  "invoice_tax",
  {
    id: id(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    kind: taxKindEnum("kind").notNull(),
    rate: numeric("rate", { precision: 7, scale: 4, mode: "number" }),
    amount: money("amount").notNull(),
  },
  (table) => [index("invoice_tax_invoice_idx").on(table.invoiceId, table.position)],
)

export const invoicePayments = pgTable(
  "invoice_payment",
  {
    id: id(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    paidOn: date("paid_on").notNull(),
    amount: money("amount").notNull(),
    method: paymentMethodEnum("method").notNull(),
    reference: text("reference"),
    note: text("note"),
    recordedById: text("recorded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("invoice_payment_invoice_idx").on(table.invoiceId)],
)
