import { z } from "zod"
import { parseDuration } from "@/lib/duration"

const duration = z
  .string()
  .trim()
  .transform((value, context) => {
    const minutes = parseDuration(value)
    if (minutes === null) {
      context.addIssue({ code: "custom", message: "Enter the time, e.g. 1.5, 1h 30m or 45m (up to 24 hours)" })
      return z.NEVER
    }
    return minutes
  })

const entryFields = {
  workDate: z.iso.date("Choose the date"),
  duration,
  note: z
    .string()
    .trim()
    .max(500)
    .transform((value) => value || null),
  billable: z.boolean(),
}

export const logTimeSchema = z.object({ projectId: z.uuid(), taskId: z.uuid().nullable(), ...entryFields })
export const updateTimeSchema = z.object({ entryId: z.uuid(), ...entryFields })
export const timeEntryIdSchema = z.object({ entryId: z.uuid() })

export type LogTimeInput = z.input<typeof logTimeSchema>
