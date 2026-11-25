export const NUMBERING_SYSTEMS = ["south_asian", "international"] as const
export type NumberingSystem = (typeof NUMBERING_SYSTEMS)[number]
export const NUMBERING_SYSTEM_LABELS: Record<NumberingSystem, string> = {
  south_asian: "Lakh and crore (1,00,000)",
  international: "Million and billion (100,000)",
}

export interface CurrencyFormat {
  code: string
  symbol: string
  majorName: string
  minorName: string
  numbering: NumberingSystem
}

export const DEFAULT_CURRENCY: CurrencyFormat = {
  code: "NPR",
  symbol: "Rs.",
  majorName: "Rupees",
  minorName: "Paisa",
  numbering: "south_asian",
}

export const VAT_RATE = 13

export const TAX_TREATMENTS = ["vat", "zero_rated", "exempt"] as const
export type TaxTreatment = (typeof TAX_TREATMENTS)[number]
export const TAX_TREATMENT_LABELS: Record<TaxTreatment, string> = {
  vat: `VAT ${VAT_RATE}%`,
  zero_rated: "Zero-rated (export)",
  exempt: "No VAT",
}

export const INVOICE_STATUSES = ["draft", "issued", "partially_paid", "paid", "cancelled"] as const
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number]
export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  issued: "Unpaid",
  partially_paid: "Partially paid",
  paid: "Paid",
  cancelled: "Cancelled",
}

export const PAYMENT_METHODS = ["bank_transfer", "cash", "cheque", "esewa", "khalti", "fonepay", "card", "other"] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Bank transfer",
  cash: "Cash",
  cheque: "Cheque",
  esewa: "eSewa",
  khalti: "Khalti",
  fonepay: "Fonepay",
  card: "Card",
  other: "Other",
}

export const TAX_REGISTRATIONS = ["vat", "pan"] as const
export type TaxRegistration = (typeof TAX_REGISTRATIONS)[number]
export const TAX_REGISTRATION_LABELS: Record<TaxRegistration, string> = {
  vat: "VAT registered",
  pan: "PAN only (not VAT registered)",
}

export const SERVICE_TYPES = ["domain", "hosting", "maintenance", "email", "other"] as const
export type ServiceType = (typeof SERVICE_TYPES)[number]
export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  domain: "Domain",
  hosting: "Hosting",
  maintenance: "Maintenance (AMC)",
  email: "Email",
  other: "Other",
}

export const BILLING_CYCLES = ["monthly", "quarterly", "half_yearly", "yearly"] as const
export type BillingCycle = (typeof BILLING_CYCLES)[number]
export const BILLING_CYCLE_LABELS: Record<BillingCycle, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  half_yearly: "Every 6 months",
  yearly: "Yearly",
}
export const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = { monthly: 1, quarterly: 3, half_yearly: 6, yearly: 12 }

export const SERVICE_STATUSES = ["active", "paused", "cancelled"] as const
export type ServiceStatus = (typeof SERVICE_STATUSES)[number]
export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
}
