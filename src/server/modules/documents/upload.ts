import "server-only"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { projectDocuments } from "@/server/db/schema"
import { acceptDocumentFile } from "@/server/lib/file-upload"
import { removeFile, saveFile } from "@/server/lib/storage"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { recordAudit } from "@/server/services/audit"
import type { ActionResult } from "@/types/action"
import { documentUploadSchema } from "./schema"

export type UploadResult = ActionResult<{ id: string }>

export async function uploadProjectDocument(user: CurrentUser, projectId: string, form: FormData): Promise<UploadResult> {
  await requireProjectCapability(user, projectId, "editTasks")

  const accepted = await acceptDocumentFile(form.get("file"))
  if (!accepted.ok) return { ok: false, error: accepted.error, fieldErrors: { file: [accepted.error] } }
  const { file } = accepted

  const parsed = documentUploadSchema.safeParse({ title: form.get("title") || file.name.replace(/\.[^.]+$/, ""), visibility: form.get("visibility") ?? undefined })
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: { title: parsed.error.issues.map((issue) => issue.message) } }
  }

  const storageKey = `projects/${projectId}/${randomUUID()}`
  await saveFile(storageKey, file.bytes)
  try {
    const [created] = await db
      .insert(projectDocuments)
      .values({
        projectId,
        title: parsed.data.title,
        fileName: file.name,
        mimeType: file.mimeType,
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
