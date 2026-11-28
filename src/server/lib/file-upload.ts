import "server-only"
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES, documentExtension, formatFileSize } from "@/config/documents"

export interface AcceptedFile {
  name: string
  mimeType: string
  size: number
  bytes: Uint8Array
}

export type FileCheck = { ok: true; file: AcceptedFile } | { ok: false; error: string }

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/\u0000-\u001f"]/g, "_").trim()
  return cleaned.slice(-200) || "file"
}

/*
 * Project documents and card attachments accept the same file types and size.
 * The stored MIME type comes from the extension allowlist, never from the
 * browser, so downloads are always served with a known, safe type.
 */
export async function acceptDocumentFile(value: FormDataEntryValue | null): Promise<FileCheck> {
  if (!(value instanceof File) || value.size === 0) return { ok: false, error: "Choose a file to upload." }
  if (value.size > DOCUMENT_MAX_BYTES) return { ok: false, error: `Files can be up to ${formatFileSize(DOCUMENT_MAX_BYTES)}.` }
  const extension = documentExtension(value.name)
  if (!extension) return { ok: false, error: "This file type is not supported. Use PDF, Office, OpenDocument, text, image or ZIP files." }
  return {
    ok: true,
    file: { name: safeFileName(value.name), mimeType: DOCUMENT_TYPES[extension], size: value.size, bytes: new Uint8Array(await value.arrayBuffer()) },
  }
}
