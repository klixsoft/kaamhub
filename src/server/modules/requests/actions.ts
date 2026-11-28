"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/server/db"
import { projectMembers, projects } from "@/server/db/schema"
import { formAction } from "@/server/lib/action"
import { forbiddenError, notFoundError } from "@/server/lib/errors"
import { notify } from "@/server/modules/notifications/service"
import { resolveProjectAccess } from "@/server/modules/projects/access"
import { firstColumn, insertCard } from "@/server/modules/projects/cards"
import { recordTaskActivity } from "@/server/modules/tasks/activity"
import { recordAudit } from "@/server/services/audit"
import { clientRequestSchema } from "./schema"

export const createClientRequest = formAction({
  schema: clientRequestSchema,
  handler: async ({ projectId, ...input }, { user }) => {
    const access = await resolveProjectAccess(user, projectId)
    if (!access) throw notFoundError("Project")
    if (!access.isClientViewer) throw forbiddenError()

    const card = await db.transaction(async (tx) => {
      const columnId = await firstColumn(tx, projectId)
      const created = await insertCard(tx, { ...input, projectId, columnId, visibility: "client", createdById: user.id, requestedById: user.id })
      await recordTaskActivity(tx, created.id, user.id, [{ action: "created" }])
      return created
    })

    const [project] = await db.select({ code: projects.code, name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1)
    const managers = await db
      .select({ id: projectMembers.userId })
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.role, "manager")))
    await notify(
      managers.map((manager) => manager.id),
      {
        kind: "client_request",
        title: `${user.name} raised a request: ${project?.code}-${card.number} ${input.title}`,
        body: project?.name ?? null,
        url: `/projects/${projectId}/board?task=${card.number}`,
        actorId: user.id,
        email: true,
      },
    )
    await recordAudit({ actorId: user.id, action: "request.created", entityType: "task", entityId: card.id })
    revalidatePath(`/projects/${projectId}/requests`)
    revalidatePath(`/projects/${projectId}/board`)
    return card
  },
})
