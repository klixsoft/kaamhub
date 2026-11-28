import { boolean, date, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import type { LetterLayout } from "@/config/letters"
import { users } from "./auth"
import { id, timestamps } from "./helpers"

export const letterTemplates = pgTable("letter_template", {
  id: id(),
  name: text("name").notNull().unique(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  archived: boolean("archived").notNull().default(false),
  ...timestamps,
})

export const letterSequences = pgTable("letter_sequence", {
  year: text("year").primaryKey(),
  lastNumber: integer("last_number").notNull().default(0),
})

export const letters = pgTable(
  "letter",
  {
    id: id(),
    number: text("number").notNull().unique(),
    templateId: uuid("template_id").references(() => letterTemplates.id, { onDelete: "set null" }),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    letterDate: date("letter_date").notNull(),
    layout: jsonb("layout").$type<LetterLayout>().notNull(),
    issuedById: text("issued_by_id").references(() => users.id, { onDelete: "set null" }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    ...timestamps,
  },
  (table) => [index("letter_recipient_idx").on(table.recipientId, table.letterDate), index("letter_created_idx").on(table.createdAt)],
)
