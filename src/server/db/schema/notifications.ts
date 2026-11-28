import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { NOTIFICATION_KINDS } from "@/config/notifications"
import { users } from "./auth"
import { id } from "./helpers"

export const notifications = pgTable(
  "notification",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: NOTIFICATION_KINDS }).notNull(),
    title: text("title").notNull(),
    body: text("body"),
    url: text("url").notNull(),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notification_user_idx").on(table.userId, table.createdAt)],
)
