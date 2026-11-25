import type { TaxKind } from "@/config/finance"
import { roundMoney } from "./money"

export interface LineInput {
  quantity: number
  rate: number
}

export interface TaxInput {
  name: string
  kind: TaxKind
  value: number
}

export interface CalculatedTax {
  name: string
  kind: TaxKind
  rate: number | null
  amount: number
}

export interface InvoiceTotals {
  subtotal: number
  discount: number
  taxableAmount: number
  taxes: CalculatedTax[]
  taxAmount: number
  total: number
}

export function lineAmount(line: LineInput): number {
  return roundMoney(line.quantity * line.rate)
}

export function calculateTax(tax: TaxInput, taxableAmount: number): CalculatedTax {
  if (tax.kind === "fixed") return { name: tax.name, kind: tax.kind, rate: null, amount: roundMoney(tax.value) }
  return { name: tax.name, kind: tax.kind, rate: tax.value, amount: roundMoney((taxableAmount * tax.value) / 100) }
}

export function calculateTotals(lines: LineInput[], discount: number, taxes: TaxInput[]): InvoiceTotals {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + lineAmount(line), 0))
  const appliedDiscount = roundMoney(Math.min(Math.max(discount, 0), subtotal))
  const taxableAmount = roundMoney(subtotal - appliedDiscount)
  const calculated = taxes.map((tax) => calculateTax(tax, taxableAmount))
  const taxAmount = roundMoney(calculated.reduce((sum, tax) => sum + tax.amount, 0))
  return { subtotal, discount: appliedDiscount, taxableAmount, taxes: calculated, taxAmount, total: roundMoney(taxableAmount + taxAmount) }
}

export function taxLabel(tax: Pick<CalculatedTax, "name" | "rate">): string {
  return tax.rate === null ? tax.name : `${tax.name} (${tax.rate}%)`
}
