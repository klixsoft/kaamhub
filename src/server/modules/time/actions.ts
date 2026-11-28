"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { todayIso, shiftDate } from "@/lib/dates"
import { db } from "@/server/db"
import { tasks, timeEntries } from "@/server/db/schema"
import { action } from "@/server/lib/action"
import { AppError, forbiddenError, notFoundError } from "@/server/lib/errors"
import { requireProjectCapability } from "@/server/modules/projects/guard"
import { logTimeSchema, timeEntryIdSchema, updateTimeSchema } from "./schema"

function assertNotFuture(workDate: string) {
  if (workDate > shiftDate(todayIso(), 1)) throw new AppError("Time can only be logged for today or earlier.")
}

function revalidateTime(projectId: string) {
  revalidatePath("/timesheets")
  revalidatePath(`/projects/${projectId}/time`)
  revalidatePath(`/projects/${projectId}/board`)
}

async function loadEditableEntry(entryId: string, user: Parameters<typeof requireProjectCapability>[0]) {
  const [entry] = await db.select({ projectId: timeEntries.projectId, userId: timeEntries.userId }).from(timeEntries).where(eq(timeEntries.id, entryId)).limit(1)
  if (!entry) throw notFoundError("Time entry")
  const access = await requireProjectCapability(user, entry.projectId, "view")
  if (access.isClientViewer || (entry.userId !== user.id && !access.canManage)) throw forbiddenError()
  return entry
}

export const logTime = action({
  schema: logTimeSchema,
  handler: async ({ projectId, taskId, workDate, duration, note, billable }, { user }) => {
    await requireProjectCapability(user, projectId, "editTasks")
    assertNotFuture(workDate)
    if (taskId) {
      const [task] = await db.select({ id: tasks.id }).from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).limit(1)
      if (!task) throw new AppError("That card does not belong to this project.")
    }
    const [entry] = await db.insert(timeEntries).values({ projectId, taskId, userId: user.id, workDate, minutes: duration, note, billable }).returning({ id: timeEntries.id })
    revalidateTime(projectId)
    return entry
  },
})

export const updateTimeEntry = action({
  schema: updateTimeSchema,
  handler: async ({ entryId, workDate, duration, note, billable }, { user }) => {
    const entry = await loadEditableEntry(entryId, user)
    assertNotFuture(workDate)
    await db.update(timeEntries).set({ workDate, minutes: duration, note, billable }).where(eq(timeEntries.id, entryId))
    revalidateTime(entry.projectId)
    return undefined
  },
})

export const deleteTimeEntry = action({
  schema: timeEntryIdSchema,
  handler: async ({ entryId }, { user }) => {
    const entry = await loadEditableEntry(entryId, user)
    await db.delete(timeEntries).where(eq(timeEntries.id, entryId))
    revalidateTime(entry.projectId)
    return undefined
  },
})
