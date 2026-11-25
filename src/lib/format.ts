const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" })
const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})

function toDate(value: Date | string): Date {
  return typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value
}

export function formatDate(value: Date | string | null | undefined): string {
  return value ? dateFormatter.format(toDate(value)) : "—"
}

export function formatDateTime(value: Date | string | null | undefined): string {
  return value ? dateTimeFormatter.format(toDate(value)) : "—"
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
