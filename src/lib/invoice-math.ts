import { type TaxTreatment, VAT_RATE } from "@/config/finance"
import { roundMoney } from "./money"

export interface LineInput {
  quantity: number
  rate: number
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  taxableAmount: number
  vatRate: number
  vatAmount: number
  total: number
}

export function lineAmount(line: LineInput): number {
  return roundMoney(line.quantity * line.rate)
}

export function calculateTotals(lines: LineInput[], discount: number, treatment: TaxTreatment): InvoiceTotals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineAmount(line), 0))
  const appliedDiscount = roundMoney(Math.min(Math.max(discount, 0), subtotal))
  const taxableAmount = roundMoney(subtotal - appliedDiscount)
  const vatRate = treatment === "vat" ? VAT_RATE : 0
  const vatAmount = roundMoney((taxableAmount * vatRate) / 100)
  return { subtotal, discount: appliedDiscount, taxableAmount, vatRate, vatAmount, total: roundMoney(taxableAmount + vatAmount) }
}
