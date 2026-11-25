import "server-only"
import { eq, inArray } from "drizzle-orm"
import { PRIORITY_LABELS, TASK_TYPE_LABELS, TASK_VISIBILITY_LABELS } from "@/config/domain"
import type { Transaction } from "@/server/db"
import { boardColumns, taskAssignees, tasks, users } from "@/server/db/schema"
import type { TaskActivityEntry } from "./activity"

export interface TaskSnapshot {
  title: string
  description: string | null
  priority: keyof typeof PRIORITY_LABELS
  type: keyof typeof TASK_TYPE_LABELS
  visibility: keyof typeof TASK_VISIBILITY_LABELS
  dueDate: string | null
  columnId: string
  assigneeIds: string[]
}

export async function snapshotTask(tx: Transaction, taskId: string): Promise<TaskSnapshot | null> {
  const [[task], assignees] = await Promise.all([
    tx
      .select({
        title: tasks.title,
        description: tasks.description,
        priority: tasks.priority,
        type: tasks.type,
        visibility: tasks.visibility,
        dueDate: tasks.dueDate,
        columnId: tasks.columnId,
      })
      .from(tasks)
      .where(eq(tasks.id, taskId))
      .limit(1),
    tx.select({ userId: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId)),
  ])
  return task ? { ...task, assigneeIds: assignees.map((row) => row.userId) } : null
}

async function namesById(tx: Transaction, table: "users" | "columns", ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map()
  const rows =
    table === "users"
      ? await tx.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids))
      : await tx.select({ id: boardColumns.id, name: boardColumns.name }).from(boardColumns).where(inArray(boardColumns.id, ids))
  return new Map(rows.map((row) => [row.id, row.name]))
}

export async function columnMove(tx: Transaction, fromColumnId: string, toColumnId: string): Promise<TaskActivityEntry[]> {
  if (fromColumnId === toColumnId) return []
  const columns = await namesById(tx, "columns", [fromColumnId, toColumnId])
  return [{ action: "moved", details: { from: columns.get(fromColumnId) ?? null, to: columns.get(toColumnId) ?? null } }]
}

export async function describeTaskChanges(tx: Transaction, before: TaskSnapshot, after: TaskSnapshot): Promise<TaskActivityEntry[]> {
  const entries: TaskActivityEntry[] = [...(await columnMove(tx, before.columnId, after.columnId))]
  if (before.title !== after.title) entries.push({ action: "renamed", details: { from: before.title, to: after.title } })
  if ((before.description ?? "") !== (after.description ?? "")) entries.push({ action: "description_changed" })
  if (before.priority !== after.priority) {
    entries.push({ action: "priority_changed", details: { from: PRIORITY_LABELS[before.priority], to: PRIORITY_LABELS[after.priority] } })
  }
  if (before.type !== after.type) entries.push({ action: "type_changed", details: { from: TASK_TYPE_LABELS[before.type], to: TASK_TYPE_LABELS[after.type] } })
  if (before.dueDate !== after.dueDate) entries.push({ action: "due_date_changed", details: { from: before.dueDate, to: after.dueDate } })
  if (before.visibility !== after.visibility) {
    entries.push({ action: "visibility_changed", details: { from: TASK_VISIBILITY_LABELS[before.visibility], to: TASK_VISIBILITY_LABELS[after.visibility] } })
  }

  const added = after.assigneeIds.filter((id) => !before.assigneeIds.includes(id))
  const removed = before.assigneeIds.filter((id) => !after.assigneeIds.includes(id))
  const people = await namesById(tx, "users", [...added, ...removed])
  for (const id of added) entries.push({ action: "assignee_added", details: { person: people.get(id) ?? null } })
  for (const id of removed) entries.push({ action: "assignee_removed", details: { person: people.get(id) ?? null } })
  return entries
}
