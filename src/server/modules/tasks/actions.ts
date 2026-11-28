"use server"

import { and, eq, max } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/server/db"
import { taskAttachments, taskChecklistItems, taskComments, tasks } from "@/server/db/schema"
import { action } from "@/server/lib/action"
import { AppError, forbiddenError, notFoundError } from "@/server/lib/errors"
import { removeFile } from "@/server/lib/storage"
import { assertCanEdit, resolveTaskAccess } from "./access"
import { recordTaskActivity } from "./activity"
import { notifyComment } from "./notifications"
import { attachmentIdSchema, checklistItemIdSchema, checklistItemSchema, checklistToggleSchema, commentIdSchema, commentSchema, commentUpdateSchema } from "./schema"

const boardPath = (projectId: string) => `/projects/${projectId}/board`

async function loadComment(commentId: string) {
  const [comment] = await db
    .select({ id: taskComments.id, taskId: taskComments.taskId, authorId: taskComments.authorId })
    .from(taskComments)
    .where(eq(taskComments.id, commentId))
    .limit(1)
  if (!comment) throw notFoundError("Comment")
  return comment
}

async function loadChecklistItem(itemId: string) {
  const [item] = await db
    .select({ id: taskChecklistItems.id, taskId: taskChecklistItems.taskId, text: taskChecklistItems.text })
    .from(taskChecklistItems)
    .where(eq(taskChecklistItems.id, itemId))
    .limit(1)
  if (!item) throw notFoundError("Checklist item")
  return item
}

export const addComment = action({
  schema: commentSchema,
  handler: async ({ taskId, body, visibility }, { user }) => {
    const { task, access, canComment } = await resolveTaskAccess(user, taskId)
    if (!canComment) throw forbiddenError()
    const effectiveVisibility = access.isClientViewer || (visibility === "client" && task.visibility === "client") ? "client" : "internal"
    await db.insert(taskComments).values({ taskId, authorId: user.id, body, visibility: effectiveVisibility })
    await db.update(tasks).set({ updatedAt: new Date() }).where(eq(tasks.id, taskId))
    await notifyComment(taskId, body, user)
    revalidatePath(boardPath(task.projectId))
    return undefined
  },
})

export const updateComment = action({
  schema: commentUpdateSchema,
  handler: async ({ commentId, body }, { user }) => {
    const comment = await loadComment(commentId)
    await resolveTaskAccess(user, comment.taskId)
    if (comment.authorId !== user.id) throw new AppError("You can only edit your own comments.", "FORBIDDEN")
    await db.update(taskComments).set({ body, editedAt: new Date() }).where(eq(taskComments.id, commentId))
    return undefined
  },
})

export const deleteComment = action({
  schema: commentIdSchema,
  handler: async ({ commentId }, { user }) => {
    const comment = await loadComment(commentId)
    const { task, access } = await resolveTaskAccess(user, comment.taskId)
    if (comment.authorId !== user.id && !access.canManage) throw forbiddenError()
    await db.delete(taskComments).where(eq(taskComments.id, commentId))
    revalidatePath(boardPath(task.projectId))
    return undefined
  },
})

export const addChecklistItem = action({
  schema: checklistItemSchema,
  handler: async ({ taskId, text }, { user }) => {
    const { task, access } = await resolveTaskAccess(user, taskId)
    assertCanEdit(access)
    await db.transaction(async (tx) => {
      const [last] = await tx.select({ value: max(taskChecklistItems.position) }).from(taskChecklistItems).where(eq(taskChecklistItems.taskId, taskId))
      await tx.insert(taskChecklistItems).values({ taskId, text, position: (last?.value ?? -1) + 1 })
      await recordTaskActivity(tx, taskId, user.id, [{ action: "checklist_item_added", details: { item: text } }])
    })
    revalidatePath(boardPath(task.projectId))
    return undefined
  },
})

export const toggleChecklistItem = action({
  schema: checklistToggleSchema,
  handler: async ({ itemId, done }, { user }) => {
    const item = await loadChecklistItem(itemId)
    const { task, access } = await resolveTaskAccess(user, item.taskId)
    assertCanEdit(access)
    await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(taskChecklistItems)
        .set({ done })
        .where(and(eq(taskChecklistItems.id, itemId), eq(taskChecklistItems.done, !done)))
        .returning({ id: taskChecklistItems.id })
      if (updated) {
        await recordTaskActivity(tx, item.taskId, user.id, [{ action: done ? "checklist_item_completed" : "checklist_item_reopened", details: { item: item.text } }])
      }
    })
    revalidatePath(boardPath(task.projectId))
    return undefined
  },
})

export const deleteChecklistItem = action({
  schema: checklistItemIdSchema,
  handler: async ({ itemId }, { user }) => {
    const item = await loadChecklistItem(itemId)
    const { task, access } = await resolveTaskAccess(user, item.taskId)
    assertCanEdit(access)
    await db.delete(taskChecklistItems).where(eq(taskChecklistItems.id, itemId))
    revalidatePath(boardPath(task.projectId))
    return undefined
  },
})

export const deleteAttachment = action({
  schema: attachmentIdSchema,
  handler: async ({ attachmentId }, { user }) => {
    const [attachment] = await db
      .select({ taskId: taskAttachments.taskId, uploadedById: taskAttachments.uploadedById, fileName: taskAttachments.fileName, storageKey: taskAttachments.storageKey })
      .from(taskAttachments)
      .where(eq(taskAttachments.id, attachmentId))
      .limit(1)
    if (!attachment) throw notFoundError("Attachment")
    const { task, access } = await resolveTaskAccess(user, attachment.taskId)
    if (attachment.uploadedById !== user.id && !access.canManage) throw forbiddenError()
    await db.transaction(async (tx) => {
      await tx.delete(taskAttachments).where(eq(taskAttachments.id, attachmentId))
      await recordTaskActivity(tx, attachment.taskId, user.id, [{ action: "attachment_removed", details: { file: attachment.fileName } }])
    })
    await removeFile(attachment.storageKey).catch(() => undefined)
    revalidatePath(boardPath(task.projectId))
    return undefined
  },
})
