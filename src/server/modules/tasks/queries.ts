import "server-only"
import { and, asc, desc, eq } from "drizzle-orm"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { boardColumns, projects, taskActivities, taskAssignees, taskAttachments, taskChecklistItems, taskComments, tasks, users } from "@/server/db/schema"
import { resolveTaskAccess } from "./access"
import type { TaskActivityAction } from "./activity"

const ACTIVITY_LIMIT = 100

export async function getTaskDetail(user: CurrentUser, taskId: string) {
  const { access, canComment } = await resolveTaskAccess(user, taskId)
  const clientOnly = access.isClientViewer

  const [[task], assignees, checklist, comments, activity, attachments] = await Promise.all([
    db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        description: tasks.description,
        type: tasks.type,
        priority: tasks.priority,
        visibility: tasks.visibility,
        columnId: tasks.columnId,
        columnName: boardColumns.name,
        dueDate: tasks.dueDate,
        estimateHours: tasks.estimateHours,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectCode: projects.code,
      })
      .from(tasks)
      .innerJoin(boardColumns, eq(boardColumns.id, tasks.columnId))
      .innerJoin(projects, eq(projects.id, tasks.projectId))
      .where(eq(tasks.id, taskId))
      .limit(1),
    db
      .select({ id: users.id, name: users.name, image: users.image })
      .from(taskAssignees)
      .innerJoin(users, eq(users.id, taskAssignees.userId))
      .where(eq(taskAssignees.taskId, taskId))
      .orderBy(asc(users.name)),
    db
      .select({ id: taskChecklistItems.id, text: taskChecklistItems.text, done: taskChecklistItems.done })
      .from(taskChecklistItems)
      .where(eq(taskChecklistItems.taskId, taskId))
      .orderBy(asc(taskChecklistItems.position)),
    db
      .select({
        id: taskComments.id,
        body: taskComments.body,
        visibility: taskComments.visibility,
        createdAt: taskComments.createdAt,
        editedAt: taskComments.editedAt,
        authorId: taskComments.authorId,
        authorName: users.name,
        authorImage: users.image,
        authorRole: users.role,
      })
      .from(taskComments)
      .leftJoin(users, eq(users.id, taskComments.authorId))
      .where(and(eq(taskComments.taskId, taskId), clientOnly ? eq(taskComments.visibility, "client") : undefined))
      .orderBy(desc(taskComments.createdAt)),
    db
      .select({
        id: taskActivities.id,
        action: taskActivities.action,
        details: taskActivities.details,
        createdAt: taskActivities.createdAt,
        actorName: users.name,
      })
      .from(taskActivities)
      .leftJoin(users, eq(users.id, taskActivities.actorId))
      .where(eq(taskActivities.taskId, taskId))
      .orderBy(desc(taskActivities.createdAt))
      .limit(ACTIVITY_LIMIT),
    db
      .select({
        id: taskAttachments.id,
        fileName: taskAttachments.fileName,
        mimeType: taskAttachments.mimeType,
        sizeBytes: taskAttachments.sizeBytes,
        visibility: taskAttachments.visibility,
        createdAt: taskAttachments.createdAt,
        uploadedById: taskAttachments.uploadedById,
        uploadedBy: users.name,
      })
      .from(taskAttachments)
      .leftJoin(users, eq(users.id, taskAttachments.uploadedById))
      .where(and(eq(taskAttachments.taskId, taskId), clientOnly ? eq(taskAttachments.visibility, "client") : undefined))
      .orderBy(desc(taskAttachments.createdAt)),
  ])
  if (!task) return null

  return {
    task: { ...task, assignees },
    checklist,
    comments: comments.map((comment) => ({ ...comment, isOwn: comment.authorId === user.id })),
    attachments: attachments.map(({ uploadedById, ...attachment }) => ({ ...attachment, canDelete: uploadedById === user.id || access.canManage })),
    activity: activity.map((entry) => ({ ...entry, action: entry.action as TaskActivityAction })),
    permissions: {
      canEdit: access.canEditTasks,
      canComment,
      canModerate: access.canManage,
      isClientViewer: clientOnly,
    },
  }
}

export type TaskDetail = NonNullable<Awaited<ReturnType<typeof getTaskDetail>>>
