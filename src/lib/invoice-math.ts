import type { TaxTreatment } from "@/config/finance"
import { roundMoney } from "./money"

export interface LineInput {
  quantity: number
  rate: number
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  taxableAmount: number
  taxRate: number
  taxAmount: number
  total: number
}

export function lineAmount(line: LineInput): number {
  return roundMoney(line.quantity * line.rate)
}

export function calculateTotals(lines: LineInput[], discount: number, treatment: TaxTreatment, standardRate: number): InvoiceTotals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineAmount(line), 0))
  const appliedDiscount = roundMoney(Math.min(Math.max(discount, 0), subtotal))
  const taxableAmount = roundMoney(subtotal - appliedDiscount)
  const taxRate = treatment === "standard" ? standardRate : 0
  const taxAmount = roundMoney((taxableAmount * taxRate) / 100)
  return { subtotal, discount: appliedDiscount, taxableAmount, taxRate, taxAmount, total: roundMoney(taxableAmount + taxAmount) }
}
