import NepaliDate from "nepali-date-converter"

const SHRAWAN_INDEX = 3

function toNepaliDate(isoDate: string): NepaliDate {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new NepaliDate(new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1))
}

export function toBsDate(isoDate: string): string {
  return toNepaliDate(isoDate).format("YYYY-MM-DD")
}

export function bsFiscalYear(isoDate: string): string {
  const bs = toNepaliDate(isoDate)
  const startYear = bs.getMonth() >= SHRAWAN_INDEX ? bs.getYear() : bs.getYear() - 1
  return `${startYear}/${String((startYear + 1) % 100).padStart(2, "0")}`
}
