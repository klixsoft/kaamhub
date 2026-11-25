import type { Calendar, NumberingSystem } from "./finance"

export interface BillingPreset {
  id: string
  label: string
  values: {
    chargesTax: boolean
    taxName: string
    taxRate: number
    taxIdLabel: string
    taxInvoiceTitle: string
    calendar: Calendar
    fiscalYearStartMonth: number
    showAmountInWords: boolean
    currencyCode: string
    currencySymbol: string
    currencyMajorName: string
    currencyMinorName: string
    currencyNumbering: NumberingSystem
  }
}

/*
 * Starting points only. Tax rules change and differ by business type, so every value stays editable
 * and should be confirmed with a local accountant.
 */
export const BILLING_PRESETS: BillingPreset[] = [
  {
    id: "generic",
    label: "Generic (no tax)",
    values: {
      chargesTax: false,
      taxName: "Tax",
      taxRate: 0,
      taxIdLabel: "Tax ID",
      taxInvoiceTitle: "Tax Invoice",
      calendar: "gregorian",
      fiscalYearStartMonth: 1,
      showAmountInWords: false,
      currencyCode: "USD",
      currencySymbol: "$",
      currencyMajorName: "Dollars",
      currencyMinorName: "Cents",
      currencyNumbering: "international",
    },
  },
  {
    id: "np",
    label: "Nepal (VAT 13%, Bikram Sambat)",
    values: {
      chargesTax: true,
      taxName: "VAT",
      taxRate: 13,
      taxIdLabel: "PAN/VAT No.",
      taxInvoiceTitle: "Tax Invoice",
      calendar: "bikram_sambat",
      fiscalYearStartMonth: 7,
      showAmountInWords: true,
      currencyCode: "NPR",
      currencySymbol: "Rs.",
      currencyMajorName: "Rupees",
      currencyMinorName: "Paisa",
      currencyNumbering: "south_asian",
    },
  },
  {
    id: "in",
    label: "India (GST 18%)",
    values: {
      chargesTax: true,
      taxName: "GST",
      taxRate: 18,
      taxIdLabel: "GSTIN",
      taxInvoiceTitle: "Tax Invoice",
      calendar: "gregorian",
      fiscalYearStartMonth: 4,
      showAmountInWords: true,
      currencyCode: "INR",
      currencySymbol: "Rs.",
      currencyMajorName: "Rupees",
      currencyMinorName: "Paise",
      currencyNumbering: "south_asian",
    },
  },
  {
    id: "gb",
    label: "United Kingdom (VAT 20%)",
    values: {
      chargesTax: true,
      taxName: "VAT",
      taxRate: 20,
      taxIdLabel: "VAT Reg. No.",
      taxInvoiceTitle: "VAT Invoice",
      calendar: "gregorian",
      fiscalYearStartMonth: 4,
      showAmountInWords: false,
      currencyCode: "GBP",
      currencySymbol: "£",
      currencyMajorName: "Pounds",
      currencyMinorName: "Pence",
      currencyNumbering: "international",
    },
  },
  {
    id: "eu",
    label: "European Union (VAT, Euro)",
    values: {
      chargesTax: true,
      taxName: "VAT",
      taxRate: 21,
      taxIdLabel: "VAT ID",
      taxInvoiceTitle: "Invoice",
      calendar: "gregorian",
      fiscalYearStartMonth: 1,
      showAmountInWords: false,
      currencyCode: "EUR",
      currencySymbol: "€",
      currencyMajorName: "Euros",
      currencyMinorName: "Cents",
      currencyNumbering: "international",
    },
  },
  {
    id: "us",
    label: "United States (no sales tax)",
    values: {
      chargesTax: false,
      taxName: "Sales tax",
      taxRate: 0,
      taxIdLabel: "EIN",
      taxInvoiceTitle: "Invoice",
      calendar: "gregorian",
      fiscalYearStartMonth: 1,
      showAmountInWords: false,
      currencyCode: "USD",
      currencySymbol: "$",
      currencyMajorName: "Dollars",
      currencyMinorName: "Cents",
      currencyNumbering: "international",
    },
  },
  {
    id: "au",
    label: "Australia (GST 10%)",
    values: {
      chargesTax: true,
      taxName: "GST",
      taxRate: 10,
      taxIdLabel: "ABN",
      taxInvoiceTitle: "Tax Invoice",
      calendar: "gregorian",
      fiscalYearStartMonth: 7,
      showAmountInWords: false,
      currencyCode: "AUD",
      currencySymbol: "A$",
      currencyMajorName: "Dollars",
      currencyMinorName: "Cents",
      currencyNumbering: "international",
    },
  },
]

export const DEFAULT_BILLING_PRESET = BILLING_PRESETS[0] as BillingPreset
