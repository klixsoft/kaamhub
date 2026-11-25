"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { projectDocuments } from "@/server/db/schema"
import { action } from "@/server/lib/action"
import { forbiddenError, notFoundError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { removeFile } from "@/server/lib/storage"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { recordAudit } from "@/server/services/audit"
import { canModifyDocument, loadDocument } from "./queries"
import { documentIdSchema, documentUpdateSchema } from "./schema"

async function requireModifiableDocument(user: CurrentUser, documentId: string) {
  const document = await loadDocument(documentId)
  if (!document) throw notFoundError("Document")
  const access = await requireProjectCapability(user, document.projectId, "view")
  if (access.isClientViewer) throw notFoundError("Document")
  if (!canModifyDocument(access, user.id, document.uploadedById)) throw forbiddenError()
  return document
}

export const updateDocument = action({
  schema: documentUpdateSchema,
  handler: async ({ documentId, title, visibility }, { user }) => {
    const document = await requireModifiableDocument(user, documentId)
    await db.update(projectDocuments).set({ title, visibility }).where(eq(projectDocuments.id, documentId))
    await recordAudit({ actorId: user.id, action: "document.updated", entityType: "project", entityId: document.projectId, metadata: { documentId, visibility } })
    revalidatePath(`/projects/${document.projectId}/documents`)
    return undefined
  },
})

export const deleteDocument = action({
  schema: documentIdSchema,
  handler: async ({ documentId }, { user }) => {
    const document = await requireModifiableDocument(user, documentId)
    await db.delete(projectDocuments).where(eq(projectDocuments.id, documentId))
    await removeFile(document.storageKey).catch((error: unknown) => logger.error("Could not remove document file", { error, documentId }))
    await recordAudit({ actorId: user.id, action: "document.deleted", entityType: "project", entityId: document.projectId, metadata: { documentId, fileName: document.fileName } })
    revalidatePath(`/projects/${document.projectId}/documents`)
    return undefined
  },
})
