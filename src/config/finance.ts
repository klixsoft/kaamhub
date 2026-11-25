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


export const TAX_TREATMENTS = ["standard", "zero_rated", "exempt"] as const
export type TaxTreatment = (typeof TAX_TREATMENTS)[number]

export function taxTreatmentLabel(treatment: TaxTreatment, taxName: string, rate: number): string {
  if (treatment === "standard") return `${taxName} ${rate}%`
  if (treatment === "zero_rated") return `Zero-rated ${taxName} (0%)`
  return `No ${taxName}`
}

export interface TaxConfig {
  enabled: boolean
  name: string
  rate: number
}

export function taxTreatmentOptions(tax: TaxConfig): Array<{ value: TaxTreatment; label: string }> {
  const available: readonly TaxTreatment[] = tax.enabled ? TAX_TREATMENTS : ["exempt"]
  return available.map((value) => ({ value, label: taxTreatmentLabel(value, tax.name, tax.rate) }))
}

export const CALENDARS = ["gregorian", "bikram_sambat"] as const
export type Calendar = (typeof CALENDARS)[number]
export const CALENDAR_LABELS: Record<Calendar, string> = {
  gregorian: "Gregorian",
  bikram_sambat: "Gregorian with Bikram Sambat (Nepal)",
}

export const MONTH_LABELS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const

export interface InvoiceFormat {
  taxName: string
  taxIdLabel: string
  title: string
  calendar: Calendar
  showAmountInWords: boolean
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
