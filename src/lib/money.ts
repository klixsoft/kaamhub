import type { Currency } from "@/config/finance"

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
const NEPALI_UNITS: ReadonlyArray<[number, string]> = [
  [10_000_000, "Crore"],
  [100_000, "Lakh"],
  [1_000, "Thousand"],
  [100, "Hundred"],
]
const INTERNATIONAL_UNITS: ReadonlyArray<[number, string]> = [
  [1_000_000_000, "Billion"],
  [1_000_000, "Million"],
  [1_000, "Thousand"],
  [100, "Hundred"],
]

const CURRENCY_WORDS: Record<Currency, { major: string; minor: string; units: ReadonlyArray<[number, string]> }> = {
  NPR: { major: "Rupees", minor: "Paisa", units: NEPALI_UNITS },
  USD: { major: "US Dollars", minor: "Cents", units: INTERNATIONAL_UNITS },
}

function underHundred(value: number): string {
  if (value < 20) return ONES[value] ?? ""
  const tens = TENS[Math.floor(value / 10)] ?? ""
  const ones = ONES[value % 10] ?? ""
  return ones ? `${tens} ${ones}` : tens
}

function integerToWords(value: number, units: ReadonlyArray<[number, string]>): string {
  if (value === 0) return "Zero"
  const parts: string[] = []
  let remaining = value
  for (const [size, name] of units) {
    if (remaining >= size) {
      parts.push(`${integerToWords(Math.floor(remaining / size), units)} ${name}`)
      remaining %= size
    }
  }
  if (remaining > 0) parts.push(underHundred(remaining))
  return parts.join(" ")
}

export function amountInWords(amount: number, currency: Currency): string {
  const words = CURRENCY_WORDS[currency]
  const cents = Math.round(amount * 100)
  const major = Math.floor(cents / 100)
  const minor = cents % 100
  const minorPart = minor > 0 ? ` and ${underHundred(minor)} ${words.minor}` : ""
  return `${words.major} ${integerToWords(major, words.units)}${minorPart} Only`
}

export function formatMoney(amount: number | string, currency: Currency): string {
  const value = typeof amount === "string" ? Number(amount) : amount
  const locale = currency === "NPR" ? "en-IN" : "en-US"
  const formatted = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
  return `${currency === "NPR" ? "Rs." : "$"} ${formatted}`
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}
