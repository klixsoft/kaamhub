export const MAX_ENTRY_MINUTES = 24 * 60

/*
 * People write time the way they think about it, so all of these mean ninety
 * minutes: "1.5", "1,5", "1h 30m", "1h30", "90m" and "1:30".
 */
export function parseDuration(input: string): number | null {
  const value = input.trim().toLowerCase().replace(",", ".")
  if (!value) return null

  let minutes: number | null = null
  const clock = /^(\d{1,2}):([0-5]\d)$/.exec(value)
  const units = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:utes?|s)?)?)?$/.exec(value)
  const hoursAndBareMinutes = /^(\d+)\s*h\s*(\d{1,2})$/.exec(value)

  if (clock) minutes = Number(clock[1]) * 60 + Number(clock[2])
  else if (/^\d+(\.\d+)?$/.test(value)) minutes = Number(value) * 60
  else if (hoursAndBareMinutes) minutes = Number(hoursAndBareMinutes[1]) * 60 + Number(hoursAndBareMinutes[2])
  else if (units && (units[1] || units[2])) minutes = Number(units[1] ?? 0) * 60 + Number(units[2] ?? 0)

  if (minutes === null || !Number.isFinite(minutes)) return null
  const rounded = Math.round(minutes)
  return rounded > 0 && rounded <= MAX_ENTRY_MINUTES ? rounded : null
}

export function formatMinutes(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  if (hours === 0) return `${minutes}m`
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`
}

export function minutesToHours(total: number): string {
  return (total / 60).toFixed(2)
}
