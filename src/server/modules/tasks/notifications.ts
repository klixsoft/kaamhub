import "server-only"
import { eq } from "drizzle-orm"
import { mentionedIn } from "@/lib/mentions"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { boardColumns, projectMembers, projects, taskAssignees, tasks, users } from "@/server/db/schema"
import { notify } from "@/server/modules/notifications/service"

async function cardSummary(taskId: string) {
  const [card] = await db
    .select({ projectId: tasks.projectId, number: tasks.number, title: tasks.title, code: projects.code, projectName: projects.name })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .where(eq(tasks.id, taskId))
    .limit(1)
  if (!card) return null
  return { ...card, label: `${card.code}-${card.number} ${card.title}`, url: `/projects/${card.projectId}/board?task=${card.number}` }
}

function excerpt(text: string, length = 160): string {
  const single = text.replace(/\s+/g, " ").trim()
  return single.length > length ? `${single.slice(0, length - 1)}…` : single
}

export async function notifyAssignees(taskId: string, userIds: readonly string[], actor: CurrentUser): Promise<void> {
  if (userIds.length === 0) return
  const card = await cardSummary(taskId)
  if (!card) return
  await notify(userIds, {
    kind: "task_assigned",
    title: `${actor.name} assigned you to ${card.label}`,
    body: card.projectName,
    url: card.url,
    actorId: actor.id,
    email: true,
  })
}

export async function notifyComment(taskId: string, body: string, author: CurrentUser): Promise<void> {
  const card = await cardSummary(taskId)
  if (!card) return
  const [members, assignees] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, role: projectMembers.role })
      .from(projectMembers)
      .innerJoin(users, eq(users.id, projectMembers.userId))
      .where(eq(projectMembers.projectId, card.projectId)),
    db.select({ id: taskAssignees.userId }).from(taskAssignees).where(eq(taskAssignees.taskId, taskId)),
  ])

  const mentioned = new Set(mentionedIn(body, members))
  const fromClient = author.role === "client"
  const followers = new Set(assignees.map((row) => row.id))
  if (fromClient) for (const member of members) if (member.role === "manager") followers.add(member.id)
  for (const id of mentioned) followers.delete(id)

  await notify(mentioned, {
    kind: "mentioned",
    title: `${author.name} mentioned you on ${card.label}`,
    body: excerpt(body),
    url: card.url,
    actorId: author.id,
    email: true,
  })
  await notify(followers, {
    kind: fromClient ? "client_comment" : "task_comment",
    title: fromClient ? `${author.name} (client) commented on ${card.label}` : `${author.name} commented on ${card.label}`,
    body: excerpt(body),
    url: card.url,
    actorId: author.id,
    email: fromClient,
  })
}

export async function notifyRequestMoved(taskId: string, columnId: string, actor: CurrentUser): Promise<void> {
  const [row] = await db
    .select({ requestedById: tasks.requestedById, column: boardColumns.name })
    .from(tasks)
    .innerJoin(boardColumns, eq(boardColumns.id, columnId))
    .where(eq(tasks.id, taskId))
    .limit(1)
  if (!row?.requestedById) return
  const card = await cardSummary(taskId)
  if (!card) return
  await notify([row.requestedById], {
    kind: "request_update",
    title: `Your request ${card.label} is now "${row.column}"`,
    body: `Moved by ${actor.name}`,
    url: card.url,
    actorId: actor.id,
    email: true,
  })
}
