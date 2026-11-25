import type { Calendar } from "@/config/finance"
import { bsFiscalYear } from "./nepali-date"

export interface FiscalYearRule {
  calendar: Calendar
  startMonth: number
}

export function fiscalYearLabel(isoDate: string, rule: FiscalYearRule): string {
  if (rule.calendar === "bikram_sambat") return bsFiscalYear(isoDate)
  const [year = 1970, month = 1] = isoDate.split("-").map(Number)
  if (rule.startMonth === 1) return String(year)
  const startYear = month >= rule.startMonth ? year : year - 1
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`
}
