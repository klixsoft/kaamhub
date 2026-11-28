import "server-only"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { taskAttachments, tasks } from "@/server/db/schema"
import { forbiddenError } from "@/server/lib/errors"
import { acceptDocumentFile } from "@/server/lib/file-upload"
import { removeFile, saveFile } from "@/server/lib/storage"
import type { ActionResult } from "@/types/action"
import { resolveTaskAccess } from "./access"
import { recordTaskActivity } from "./activity"

export async function attachToTask(user: CurrentUser, taskId: string, form: FormData): Promise<ActionResult<{ id: string }>> {
  const { task, access, canComment } = await resolveTaskAccess(user, taskId)
  if (!canComment) throw forbiddenError()
  const accepted = await acceptDocumentFile(form.get("file"))
  if (!accepted.ok) return { ok: false, error: accepted.error }

  const visibility = access.isClientViewer || (form.get("visibility") === "client" && task.visibility === "client") ? "client" : "internal"
  const storageKey = `projects/${task.projectId}/cards/${randomUUID()}`
  await saveFile(storageKey, accepted.file.bytes)
  try {
    const created = await db.transaction(async (tx) => {
      const [attachment] = await tx
        .insert(taskAttachments)
        .values({ taskId, fileName: accepted.file.name, mimeType: accepted.file.mimeType, sizeBytes: accepted.file.size, storageKey, visibility, uploadedById: user.id })
        .returning({ id: taskAttachments.id })
      await recordTaskActivity(tx, taskId, user.id, [{ action: "attachment_added", details: { file: accepted.file.name } }])
      await tx.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId))
      return attachment
    })
    if (!created) throw new Error("Attachment insert returned no row")
    revalidatePath(`/projects/${task.projectId}/board`)
    return { ok: true, data: { id: created.id } }
  } catch (error) {
    await removeFile(storageKey)
    throw error
  }
}

export async function readableAttachment(user: CurrentUser, attachmentId: string) {
  const [attachment] = await db.select().from(taskAttachments).where(eq(taskAttachments.id, attachmentId)).limit(1)
  if (!attachment) return null
  const { access } = await resolveTaskAccess(user, attachment.taskId)
  if (access.isClientViewer && attachment.visibility !== "client") return null
  return attachment
}
