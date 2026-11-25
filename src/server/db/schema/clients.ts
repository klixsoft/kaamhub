import { boolean, index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { clientStatusEnum } from "./enums"
import { id, timestamps } from "./helpers"

export const clients = pgTable(
  "client",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    taxNumber: text("tax_number"),
    address: text("address"),
    notes: text("notes"),
    status: clientStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [index("client_status_idx").on(table.status), index("client_name_idx").on(table.name)],
)

export const clientContacts = pgTable(
  "client_contact",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobTitle: text("job_title"),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.clientId, table.userId] }), index("client_contact_user_idx").on(table.userId)],
)
