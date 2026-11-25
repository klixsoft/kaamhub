import "server-only"
import { eq } from "drizzle-orm"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { tasks } from "@/server/db/schema"
import { forbiddenError, notFoundError } from "@/server/lib/errors"
import { resolveProjectAccess } from "@/server/modules/projects/access"

export async function resolveTaskAccess(user: CurrentUser, taskId: string) {
  const [task] = await db
    .select({ id: tasks.id, projectId: tasks.projectId, visibility: tasks.visibility })
    .from(tasks)
    .where(eq(tasks.id, taskId))
    .limit(1)
  if (!task) throw notFoundError("Task")
  const access = await resolveProjectAccess(user, task.projectId)
  if (!access || (access.isClientViewer && task.visibility !== "client")) throw notFoundError("Task")
  return { task, access, canComment: access.canEditTasks || access.isClientViewer }
}

export function assertCanEdit(access: { canEditTasks: boolean }) {
  if (!access.canEditTasks) throw forbiddenError()
}
