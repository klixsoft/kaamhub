export interface LetterLayout {
  letterheadKey: string | null
  topMm: number
  bottomMm: number
  leftMm: number
  rightMm: number
  signatoryName: string
  signatoryTitle: string
}

export const LETTERHEAD_MAX_BYTES = 5 * 1024 * 1024

export const LETTERHEAD_TYPES = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" } as const

export const LETTER_STATUSES = ["issued", "revoked"] as const
export type LetterStatus = (typeof LETTER_STATUSES)[number]
export const LETTER_STATUS_LABELS: Record<LetterStatus, string> = { issued: "Issued", revoked: "Revoked" }

export const letterPdfUrl = (id: string) => `/api/letters/${id}/pdf`
