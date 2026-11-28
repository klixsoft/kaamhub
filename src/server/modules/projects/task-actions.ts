"use server"

import { and, eq, inArray, sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db, type Transaction } from "@/server/db"
import { boardColumns, projectMembers, taskAssignees, tasks } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, notFoundError } from "@/server/lib/errors"
import { recordTaskActivity } from "@/server/modules/tasks/activity"
import { notifyAssignees, notifyRequestMoved } from "@/server/modules/tasks/notifications"
import { columnMove, describeTaskChanges, snapshotTask } from "@/server/modules/tasks/changes"
import { recordAudit } from "@/server/services/audit"
import { insertCard } from "./cards"
import { requireProjectCapability } from "./guard"
import { needsRebalance, POSITION_STEP, positionBetween } from "./positions"
import { taskDeleteSchema, taskMoveSchema, taskSchema, taskUpdateSchema } from "./schema"

async function assertColumnInProject(executor: Transaction | typeof db, columnId: string, projectId: string) {
  const [column] = await executor
    .select({ id: boardColumns.id })
    .from(boardColumns)
    .where(and(eq(boardColumns.id, columnId), eq(boardColumns.projectId, projectId)))
    .limit(1)
  if (!column) throw new AppError("The selected column does not belong to this project.")
}

async function validAssignees(executor: Transaction | typeof db, projectId: string, assigneeIds: string[]): Promise<string[]> {
  if (assigneeIds.length === 0) return []
  const rows = await executor
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), inArray(projectMembers.userId, assigneeIds)))
  if (rows.length !== new Set(assigneeIds).size) throw new AppError("Assignees must be members of this project.")
  return rows.map((row) => row.userId)
}

async function loadTaskProject(taskId: string) {
  const [task] = await db.select({ projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
  if (!task) throw notFoundError("Task")
  return task.projectId
}

const boardPath = (projectId: string) => `/projects/${projectId}/board`

export const createTask = formAction({
  schema: taskSchema,
  handler: async ({ assigneeIds, ...input }, { user }) => {
    await requireProjectCapability(user, input.projectId, "editTasks")

    const created = await db.transaction(async (tx) => {
      await assertColumnInProject(tx, input.columnId, input.projectId)
      const assignees = await validAssignees(tx, input.projectId, assigneeIds)
      const task = await insertCard(tx, {
        ...input,
        estimateHours: input.estimateHours === null || input.estimateHours === undefined ? null : String(input.estimateHours),
        createdById: user.id,
      })
      if (assignees.length > 0) await tx.insert(taskAssignees).values(assignees.map((userId) => ({ taskId: task.id, userId })))
      await recordTaskActivity(tx, task.id, user.id, [{ action: "created" }])
      return task
    })

    await notifyAssignees(created.id, assigneeIds, user)
    await recordAudit({ actorId: user.id, action: "task.created", entityType: "task", entityId: created.id })
    revalidatePath(boardPath(input.projectId))
    return created
  },
})

export const updateTask = formAction({
  schema: taskUpdateSchema,
  handler: async ({ taskId, assigneeIds, projectId: _projectId, ...input }, { user }) => {
    const projectId = await loadTaskProject(taskId)
    await requireProjectCapability(user, projectId, "editTasks")

    const changes = await db.transaction(async (tx) => {
      await assertColumnInProject(tx, input.columnId, projectId)
      const assignees = await validAssignees(tx, projectId, assigneeIds)
      const before = await snapshotTask(tx, taskId)
      await tx
        .update(tasks)
        .set({
          ...input,
          estimateHours: input.estimateHours === null || input.estimateHours === undefined ? null : String(input.estimateHours),
        })
        .where(eq(tasks.id, taskId))
      await tx.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId))
      if (assignees.length > 0) await tx.insert(taskAssignees).values(assignees.map((userId) => ({ taskId, userId })))
      const after = await snapshotTask(tx, taskId)
      if (before && after) await recordTaskActivity(tx, taskId, user.id, await describeTaskChanges(tx, before, after))
      return { newlyAssigned: assignees.filter((id) => !before?.assigneeIds.includes(id)), movedTo: before && before.columnId !== input.columnId ? input.columnId : null }
    })

    await notifyAssignees(taskId, changes.newlyAssigned, user)
    if (changes.movedTo) await notifyRequestMoved(taskId, changes.movedTo, user)
    await recordAudit({ actorId: user.id, action: "task.updated", entityType: "task", entityId: taskId })
    revalidatePath(boardPath(projectId))
    return { id: taskId }
  },
})

async function rebalanceColumn(tx: Transaction, columnId: string) {
  await tx.execute(sql`
    update ${tasks} set position = ranked.rank * ${POSITION_STEP}
    from (select id, row_number() over (order by position, id) as rank from ${tasks} where column_id = ${columnId}) as ranked
    where ${tasks.id} = ranked.id
  `)
}

export const moveTask = action({
  schema: taskMoveSchema,
  handler: async ({ taskId, columnId, beforeTaskId, afterTaskId }, { user }) => {
    const projectId = await loadTaskProject(taskId)
    await requireProjectCapability(user, projectId, "editTasks")

    const changedColumn = await db.transaction(async (tx) => {
      await assertColumnInProject(tx, columnId, projectId)
      const neighbourIds = [beforeTaskId, afterTaskId].filter((value): value is string => value !== null)
      const neighbours =
        neighbourIds.length > 0
          ? await tx
              .select({ id: tasks.id, position: tasks.position })
              .from(tasks)
              .where(and(inArray(tasks.id, neighbourIds), eq(tasks.columnId, columnId)))
          : []
      const positionOf = (id: string | null) => (id ? (neighbours.find((row) => row.id === id)?.position ?? null) : null)
      let before = positionOf(beforeTaskId)
      let after = positionOf(afterTaskId)

      if (needsRebalance(before, after)) {
        await rebalanceColumn(tx, columnId)
        const refreshed = await tx
          .select({ id: tasks.id, position: tasks.position })
          .from(tasks)
          .where(inArray(tasks.id, neighbourIds))
        before = refreshed.find((row) => row.id === beforeTaskId)?.position ?? null
        after = refreshed.find((row) => row.id === afterTaskId)?.position ?? null
      }

      const [current] = await tx.select({ columnId: tasks.columnId }).from(tasks).where(eq(tasks.id, taskId)).limit(1)
      await tx.update(tasks).set({ columnId, position: positionBetween(before, after) }).where(eq(tasks.id, taskId))
      if (current) await recordTaskActivity(tx, taskId, user.id, await columnMove(tx, current.columnId, columnId))
      return current !== undefined && current.columnId !== columnId
    })

    if (changedColumn) await notifyRequestMoved(taskId, columnId, user)

    revalidatePath(boardPath(projectId))
    return undefined
  },
})

export const deleteTask = action({
  schema: taskDeleteSchema,
  handler: async ({ taskId }, { user }) => {
    const projectId = await loadTaskProject(taskId)
    await requireProjectCapability(user, projectId, "editTasks")
    await db.delete(tasks).where(eq(tasks.id, taskId))
    await recordAudit({ actorId: user.id, action: "task.deleted", entityType: "task", entityId: taskId })
    revalidatePath(boardPath(projectId))
    return undefined
  },
})
