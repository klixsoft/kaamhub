import "server-only"
import { and, eq, inArray } from "drizzle-orm"
import { after } from "next/server"
import { env } from "@/config/env"
import type { NotificationKind } from "@/config/notifications"
import { isUserAccessAllowed } from "@/server/auth/access"
import { db } from "@/server/db"
import { notifications, users } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import { sendMail } from "@/server/services/mailer"

export interface NotificationInput {
  kind: NotificationKind
  title: string
  body?: string | null
  url: string
  actorId: string | null
  email?: boolean
}

/*
 * Notifications are written straight away so the bell is accurate on the next
 * poll; emails are sent after the response so a slow mail server never delays
 * the action that triggered them.
 */
export async function notify(recipientIds: Iterable<string>, input: NotificationInput): Promise<void> {
  const unique = [...new Set(recipientIds)].filter((id) => id && id !== input.actorId)
  if (unique.length === 0) return

  const recipients = await db
    .select({ id: users.id, email: users.email, name: users.name, status: users.status, accessExpiresAt: users.accessExpiresAt })
    .from(users)
    .where(and(inArray(users.id, unique), eq(users.status, "active")))
  const active = recipients.filter((recipient) => isUserAccessAllowed(recipient))
  if (active.length === 0) return

  await db.insert(notifications).values(
    active.map((recipient) => ({ userId: recipient.id, kind: input.kind, title: input.title, body: input.body ?? null, url: input.url, actorId: input.actorId })),
  )

  if (!input.email) return
  after(async () => {
    for (const recipient of active) {
      try {
        await sendMail({
          to: recipient.email,
          subject: input.title,
          text: [`Hello ${recipient.name},`, "", input.title, input.body ? `\n${input.body}` : "", "", `Open it in KaamHub: ${env.APP_URL}${input.url}`].join("\n"),
        })
      } catch (error) {
        logger.error("Failed to send notification email", { error, userId: recipient.id, kind: input.kind })
      }
    }
  })
}
