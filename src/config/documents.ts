export const DOCUMENT_MAX_BYTES = 25 * 1024 * 1024

export const DOCUMENT_TYPES = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  rtf: "application/rtf",
  txt: "text/plain",
  md: "text/markdown",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  zip: "application/zip",
} as const

export type DocumentExtension = keyof typeof DOCUMENT_TYPES

export const DOCUMENT_ACCEPT = Object.keys(DOCUMENT_TYPES)
  .map((extension) => `.${extension}`)
  .join(",")

export const INLINE_DOCUMENT_TYPES: ReadonlySet<string> = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"])

export function documentExtension(fileName: string): DocumentExtension | null {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? ""
  return extension in DOCUMENT_TYPES ? (extension as DocumentExtension) : null
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
