import { z } from "zod"
import { TASK_VISIBILITIES } from "@/config/domain"

const title = z.string().trim().min(2, "Give the document a title, e.g. Software requirements").max(160)

export const documentUploadSchema = z.object({
  title,
  visibility: z.enum(TASK_VISIBILITIES).default("internal"),
})

export const documentUpdateSchema = z.object({
  documentId: z.uuid(),
  title,
  visibility: z.enum(TASK_VISIBILITIES),
})

export const documentIdSchema = z.object({ documentId: z.uuid() })
