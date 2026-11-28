"use server"

import { and, eq, inArray, isNull } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/server/db"
import { notifications } from "@/server/db/schema"
import { action } from "@/server/lib/action"

export const markNotificationsRead = action({
  schema: z.object({ ids: z.array(z.uuid()).max(100).optional() }),
  handler: async ({ ids }, { user }) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, user.id), isNull(notifications.readAt), ids ? inArray(notifications.id, ids) : undefined))
    return undefined
  },
})
