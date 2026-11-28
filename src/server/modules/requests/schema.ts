import { z } from "zod"
import { PRIORITIES, TASK_TYPES } from "@/config/domain"

export const clientRequestSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(4, "Summarise the request in a few words").max(160),
  description: z.string().trim().min(10, "Describe what you need, with steps or links if it helps").max(10000),
  type: z.enum(TASK_TYPES),
  priority: z.enum(PRIORITIES),
})
