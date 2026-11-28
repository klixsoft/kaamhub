import "server-only"
import { renderToBuffer } from "@react-pdf/renderer"
import type { LetterLayout } from "@/config/letters"
import { readFileBuffer } from "@/server/lib/storage"
import { getCompanyName } from "@/server/modules/settings/queries"
import { LetterDocument } from "./document"

export interface PrintableLetter {
  number: string
  letterDate: string
  title: string
  body: string
  layout: LetterLayout
  revoked: boolean
}

async function loadLetterhead(key: string | null) {
  if (!key) return null
  const data = await readFileBuffer(key)
  if (!data) return null
  return { data, format: key.endsWith(".png") ? ("png" as const) : ("jpg" as const) }
}

export async function renderLetterPdf(letter: PrintableLetter): Promise<Buffer> {
  const [letterhead, companyName] = await Promise.all([loadLetterhead(letter.layout.letterheadKey), getCompanyName()])
  return renderToBuffer(LetterDocument({ ...letter, letterhead, companyName }))
}

export function letterFileName(letter: Pick<PrintableLetter, "number" | "title">): string {
  return `${letter.number}-${letter.title}`.replace(/[^A-Za-z0-9-]+/g, "-").replace(/-+/g, "-").toLowerCase() + ".pdf"
}
