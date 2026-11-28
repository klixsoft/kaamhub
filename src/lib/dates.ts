const DAY_MS = 24 * 60 * 60 * 1000

function toUtc(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number)
  return Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1)
}

function fromUtc(time: number): string {
  return new Date(time).toISOString().slice(0, 10)
}

export function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS)
}

export function shiftDate(isoDate: string, days: number): string {
  return fromUtc(toUtc(isoDate) + days * DAY_MS)
}

export function addMonths(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const target = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(day ?? 1, lastDay))
  return fromUtc(target.getTime())
}

export function startOfWeek(isoDate: string): string {
  const weekday = new Date(toUtc(isoDate)).getUTCDay()
  return shiftDate(isoDate, -((weekday + 6) % 7))
}

export function isIsoDate(value: string | undefined | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value
}
