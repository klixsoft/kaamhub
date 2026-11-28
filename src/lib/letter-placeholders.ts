export const LETTER_PLACEHOLDERS = {
  "recipient.name": "Recipient's full name",
  "recipient.email": "Recipient's email",
  "recipient.designation": "Recipient's designation",
  "recipient.department": "Recipient's department",
  "recipient.employee_code": "Employee code",
  "recipient.joined_on": "Joining date",
  "recipient.ends_on": "Engagement end date",
  "recipient.engagement": "Engagement type",
  "recipient.manager": "Reporting manager",
  "company.name": "Company name",
  "company.legal_name": "Registered company name",
  "company.address": "Company address",
  "letter.number": "Letter number",
  "letter.date": "Letter date",
  "signatory.name": "Signatory's name",
  "signatory.title": "Signatory's title",
} as const

export type LetterPlaceholder = keyof typeof LETTER_PLACEHOLDERS

export const ISSUE_TIME_PLACEHOLDERS: readonly LetterPlaceholder[] = ["letter.number", "letter.date"]

const PATTERN = /\{\{\s*([a-z][a-z0-9_.]*)\s*\}\}/gi

export function isBuiltInPlaceholder(key: string): key is LetterPlaceholder {
  return key in LETTER_PLACEHOLDERS
}

export function placeholdersIn(text: string): string[] {
  return [...new Set([...text.matchAll(PATTERN)].map((match) => (match[1] ?? "").toLowerCase()))]
}

export function customPlaceholders(text: string): string[] {
  return placeholdersIn(text).filter((key) => !isBuiltInPlaceholder(key))
}

export function customPlaceholderLabel(key: string): string {
  const words = key.replace(/[._]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function fillPlaceholders(text: string, values: Readonly<Record<string, string | undefined>>): string {
  return text.replace(PATTERN, (match, key: string) => {
    const value = values[key.toLowerCase()]
    return value === undefined || value === "" ? match : value
  })
}
