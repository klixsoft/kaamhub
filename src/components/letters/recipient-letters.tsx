import { FileTextIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { letterPdfUrl } from "@/config/letters"
import { formatDate } from "@/lib/format"
import type { RecipientLetter } from "@/server/modules/letters/queries"
import { LetterActions } from "./letter-actions"

interface RecipientLettersProps {
  letters: RecipientLetter[]
  canManage: boolean
  emptyText: string
}

export function RecipientLetters({ letters, canManage, emptyText }: RecipientLettersProps) {
  if (letters.length === 0) return <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">{emptyText}</p>
  return (
    <ul className="divide-y rounded-lg border">
      {letters.map((letter) => (
        <li key={letter.id} className="flex items-center justify-between gap-3 p-3">
          <div className="flex min-w-0 items-start gap-3">
            <FileTextIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <a href={letterPdfUrl(letter.id)} target="_blank" rel="noopener" className="block truncate text-sm font-medium hover:underline">
                {letter.title}
              </a>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{letter.number}</span> · {formatDate(letter.letterDate)}
                {letter.revokedAt ? ` · Revoked: ${letter.revokedReason ?? ""}` : ""}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {letter.revokedAt ? <Badge variant="destructive">Revoked</Badge> : null}
            <LetterActions letter={letter} canManage={canManage} />
          </div>
        </li>
      ))}
    </ul>
  )
}
