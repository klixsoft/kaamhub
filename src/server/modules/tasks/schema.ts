import { z } from "zod"
import { TASK_VISIBILITIES } from "@/config/domain"

export const commentSchema = z.object({
  taskId: z.uuid(),
  body: z.string().trim().min(1, "Write a comment").max(10000),
  visibility: z.enum(TASK_VISIBILITIES).default("internal"),
})

export const commentUpdateSchema = z.object({
  commentId: z.uuid(),
  body: z.string().trim().min(1, "Write a comment").max(10000),
})

export const commentIdSchema = z.object({ commentId: z.uuid() })

export const checklistItemSchema = z.object({
  taskId: z.uuid(),
  text: z.string().trim().min(1, "Describe the item").max(300),
})

export const checklistToggleSchema = z.object({ itemId: z.uuid(), done: z.boolean() })
export const checklistItemIdSchema = z.object({ itemId: z.uuid() })
export const attachmentIdSchema = z.object({ attachmentId: z.uuid() })
