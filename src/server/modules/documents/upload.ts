import "server-only"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { DOCUMENT_MAX_BYTES, DOCUMENT_TYPES, documentExtension, formatFileSize } from "@/config/documents"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { projectDocuments } from "@/server/db/schema"
import { removeFile, saveFile } from "@/server/lib/storage"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { recordAudit } from "@/server/services/audit"
import type { ActionResult } from "@/types/action"
import { documentUploadSchema } from "./schema"

export type UploadResult = ActionResult<{ id: string }>

function safeFileName(name: string): string {
  const cleaned = name.replace(/[\\/\u0000-\u001f"]/g, "_").trim()
  return cleaned.slice(-200) || "document"
}

export async function uploadProjectDocument(user: CurrentUser, projectId: string, form: FormData): Promise<UploadResult> {
  await requireProjectCapability(user, projectId, "editTasks")

  const file = form.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload.", fieldErrors: { file: ["Choose a file to upload."] } }
  if (file.size > DOCUMENT_MAX_BYTES) {
    const message = `Files can be up to ${formatFileSize(DOCUMENT_MAX_BYTES)}.`
    return { ok: false, error: message, fieldErrors: { file: [message] } }
  }
  const extension = documentExtension(file.name)
  if (!extension) {
    const message = "This file type is not supported. Use PDF, Office, OpenDocument, text, image or ZIP files."
    return { ok: false, error: message, fieldErrors: { file: [message] } }
  }

  const parsed = documentUploadSchema.safeParse({ title: form.get("title") || file.name.replace(/\.[^.]+$/, ""), visibility: form.get("visibility") ?? undefined })
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: { title: parsed.error.issues.map((issue) => issue.message) } }
  }

  const storageKey = `projects/${projectId}/${randomUUID()}`
  await saveFile(storageKey, new Uint8Array(await file.arrayBuffer()))
  try {
    const [created] = await db
      .insert(projectDocuments)
      .values({
        projectId,
        title: parsed.data.title,
        fileName: safeFileName(file.name),
        mimeType: DOCUMENT_TYPES[extension],
        sizeBytes: file.size,
        storageKey,
        visibility: parsed.data.visibility,
        uploadedById: user.id,
      })
      .returning({ id: projectDocuments.id })
    if (!created) throw new Error("Document insert returned no row")
    await recordAudit({ actorId: user.id, action: "document.uploaded", entityType: "project", entityId: projectId, metadata: { documentId: created.id, fileName: file.name } })
    revalidatePath(`/projects/${projectId}/documents`)
    return { ok: true, data: { id: created.id } }
  } catch (error) {
    await removeFile(storageKey)
    throw error
  }
}
