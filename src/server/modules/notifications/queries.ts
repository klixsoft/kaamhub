import "server-only"
import { and, count, desc, eq, isNull } from "drizzle-orm"
import { db } from "@/server/db"
import { notifications, users } from "@/server/db/schema"

const LIMIT = 30

export async function notificationsFor(userId: string) {
  const [items, [unread]] = await Promise.all([
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        title: notifications.title,
        body: notifications.body,
        url: notifications.url,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actorName: users.name,
        actorImage: users.image,
      })
      .from(notifications)
      .leftJoin(users, eq(users.id, notifications.actorId))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(LIMIT),
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt))),
  ])
  return { items, unread: unread?.value ?? 0 }
}

export type NotificationFeed = Awaited<ReturnType<typeof notificationsFor>>
export type NotificationItem = NotificationFeed["items"][number]
