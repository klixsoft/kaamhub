export interface Mentionable {
  id: string
  name: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/*
 * Mentions are written as "@" followed by a person's full name, which the
 * comment box inserts for you. Longer names are matched first so "@Sita Rai"
 * is not also read as "@Sita" when both people exist.
 */
export function mentionedIn(text: string, people: readonly Mentionable[]): string[] {
  const found = new Set<string>()
  let remaining = text
  for (const person of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const pattern = new RegExp(`@${escapeRegExp(person.name)}(?![\\p{L}\\p{N}])`, "giu")
    if (pattern.test(remaining)) {
      found.add(person.id)
      remaining = remaining.replace(pattern, " ")
    }
  }
  return [...found]
}

export function mentionToken(name: string): string {
  return `@${name}`
}
