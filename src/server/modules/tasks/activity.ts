import "server-only"
import type { Database, Transaction } from "@/server/db"
import { taskActivities } from "@/server/db/schema"

export const TASK_ACTIVITY_ACTIONS = [
  "created",
  "moved",
  "renamed",
  "description_changed",
  "priority_changed",
  "type_changed",
  "due_date_changed",
  "visibility_changed",
  "assignee_added",
  "assignee_removed",
  "checklist_item_added",
  "checklist_item_completed",
  "checklist_item_reopened",
] as const

export type TaskActivityAction = (typeof TASK_ACTIVITY_ACTIONS)[number]

export interface TaskActivityEntry {
  action: TaskActivityAction
  details?: Record<string, string | null>
}

export async function recordTaskActivity(
  executor: Database | Transaction,
  taskId: string,
  actorId: string | null,
  entries: TaskActivityEntry[],
): Promise<void> {
  if (entries.length === 0) return
  await executor.insert(taskActivities).values(entries.map((entry) => ({ taskId, actorId, action: entry.action, details: entry.details ?? null })))
}
