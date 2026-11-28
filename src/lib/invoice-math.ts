import type { InvoiceStatus, TaxKind } from "@/config/finance"
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

export interface Settlement {
  total: number
  amountPaid: number
  amountCredited: number
}

export function balanceDue(invoice: Settlement): number {
  return Math.max(roundMoney(invoice.total - invoice.amountPaid - invoice.amountCredited), 0)
}

export function refundDue(invoice: Settlement): number {
  return Math.max(roundMoney(invoice.amountPaid + invoice.amountCredited - invoice.total), 0)
}

export function settlementStatus(invoice: Settlement): Extract<InvoiceStatus, "issued" | "partially_paid" | "paid" | "credited"> {
  if (invoice.amountCredited >= invoice.total) return "credited"
  if (invoice.amountPaid + invoice.amountCredited >= invoice.total) return "paid"
  return invoice.amountPaid > 0 || invoice.amountCredited > 0 ? "partially_paid" : "issued"
}

export interface CreditLineInput {
  description: string
  amount: number
}

/*
 * A credit note reverses part of an invoice. Percentage taxes are applied to
 * the credited amount at the invoice's rates; fixed taxes are not reversed
 * automatically and can be credited as a line of their own.
 */
export function calculateCredit(lines: CreditLineInput[], invoiceTaxes: Array<Pick<CalculatedTax, "name" | "kind" | "rate">>) {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0))
  const taxes: CalculatedTax[] = invoiceTaxes
    .filter((tax) => tax.kind === "percentage" && tax.rate !== null)
    .map((tax) => ({ name: tax.name, kind: tax.kind, rate: tax.rate, amount: roundMoney((subtotal * (tax.rate ?? 0)) / 100) }))
  const taxAmount = roundMoney(taxes.reduce((sum, tax) => sum + tax.amount, 0))
  return { subtotal, taxes, taxAmount, total: roundMoney(subtotal + taxAmount) }
}
