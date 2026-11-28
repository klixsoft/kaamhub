export interface CardReference {
  code: string
  number: number
}

const REFERENCE = /(?<![A-Za-z0-9-])([A-Za-z][A-Za-z0-9-]{1,15})-(\d{1,9})(?![A-Za-z0-9])/g

/*
 * Finds card references such as BRF-4 or acme-web-12 in commit messages and pull
 * request titles. Project codes may contain dashes, so the last dash before the
 * digits separates the code from the card number. Matching is case-insensitive
 * because people often type references in lower case.
 */
export function findCardReferences(...texts: (string | null | undefined)[]): CardReference[] {
  const found = new Map<string, CardReference>()
  for (const text of texts) {
    if (!text) continue
    for (const match of text.matchAll(REFERENCE)) {
      const code = match[1].toUpperCase()
      const number = Number(match[2])
      if (number > 0) found.set(`${code}-${number}`, { code, number })
    }
  }
  return [...found.values()]
}
