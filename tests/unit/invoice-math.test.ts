import { describe, expect, it } from "vitest"
import { balanceDue, calculateCredit, calculateTotals, refundDue, settlementStatus, taxLabel } from "@/lib/invoice-math"
import { fiscalYearLabel } from "@/lib/fiscal-year"
import { amountInWords, roundMoney } from "@/lib/money"

const dollars = { code: "USD", symbol: "$", majorName: "Dollars", minorName: "Cents", numbering: "international" } as const

describe("invoice totals", () => {
  it("applies percentage and fixed taxes to the amount after discount", () => {
    const totals = calculateTotals([{ quantity: 2, rate: 500 }], 0, [
      { name: "VAT", kind: "percentage", value: 13 },
      { name: "Service charge", kind: "fixed", value: 50 },
    ])
    expect(totals).toMatchObject({ subtotal: 1000, taxableAmount: 1000, taxAmount: 180, total: 1180 })
    expect(totals.taxes.map(taxLabel)).toEqual(["VAT (13%)", "Service charge"])
  })

  it("never discounts below zero or more than the subtotal", () => {
    expect(calculateTotals([{ quantity: 1, rate: 100 }], 250, []).total).toBe(0)
    expect(calculateTotals([{ quantity: 1, rate: 100 }], -20, []).discount).toBe(0)
  })

  it("rounds money to cents without floating point drift", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3)
    expect(calculateTotals([{ quantity: 3, rate: 33.33 }], 0, [{ name: "GST", kind: "percentage", value: 18 }]).total).toBe(117.99)
  })
})

describe("amount in words", () => {
  it("writes international and lakh/crore amounts", () => {
    expect(amountInWords(1250.5, dollars)).toBe("Dollars One Thousand Two Hundred Fifty and Fifty Cents Only")
    expect(amountInWords(150000, { ...dollars, majorName: "Rupees", minorName: "Paisa", numbering: "south_asian" })).toBe("Rupees One Lakh Fifty Thousand Only")
  })
})

describe("fiscal year labels", () => {
  it("uses the calendar year when the fiscal year starts in January", () => {
    expect(fiscalYearLabel("2026-11-26", { calendar: "gregorian", startMonth: 1 })).toBe("2026")
  })

  it("spans two years for other start months", () => {
    expect(fiscalYearLabel("2026-03-31", { calendar: "gregorian", startMonth: 4 })).toBe("2025-26")
    expect(fiscalYearLabel("2026-04-01", { calendar: "gregorian", startMonth: 4 })).toBe("2026-27")
  })
})

describe("credit notes and settlement", () => {
  const taxes = [
    { name: "VAT", kind: "percentage" as const, rate: 13 },
    { name: "Service charge", kind: "fixed" as const, rate: null },
  ]

  it("applies percentage taxes to the credited amount and leaves fixed charges out", () => {
    const credit = calculateCredit([{ description: "Discount agreed later", amount: 200 }], taxes)
    expect(credit).toMatchObject({ subtotal: 200, taxAmount: 26, total: 226 })
    expect(credit.taxes.map(taxLabel)).toEqual(["VAT (13%)"])
  })

  it("works out the status from payments and credits", () => {
    expect(settlementStatus({ total: 1180, amountPaid: 0, amountCredited: 0 })).toBe("issued")
    expect(settlementStatus({ total: 1180, amountPaid: 0, amountCredited: 226 })).toBe("partially_paid")
    expect(settlementStatus({ total: 1180, amountPaid: 954, amountCredited: 226 })).toBe("paid")
    expect(settlementStatus({ total: 1180, amountPaid: 0, amountCredited: 1180 })).toBe("credited")
  })

  it("reports the balance due and any refund owed to the client", () => {
    expect(balanceDue({ total: 1180, amountPaid: 500, amountCredited: 226 })).toBe(454)
    expect(balanceDue({ total: 1180, amountPaid: 1180, amountCredited: 226 })).toBe(0)
    expect(refundDue({ total: 1180, amountPaid: 1180, amountCredited: 226 })).toBe(226)
  })
})
