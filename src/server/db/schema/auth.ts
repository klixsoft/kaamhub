import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"
import { systemRoleEnum, userStatusEnum } from "./enums"
import { id, timestamps } from "./helpers"

export const users = pgTable(
  "user",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    image: text("image"),
    role: systemRoleEnum("role").notNull().default("employee"),
    status: userStatusEnum("status").notNull().default("active"),
    accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
    passwordHash: text("password_hash"),
    githubUsername: text("github_username"),
    githubUserId: text("github_user_id").unique(),
    ...timestamps,
  },
  (table) => [index("user_role_idx").on(table.role), index("user_status_idx").on(table.status)],
)

export const userSessions = pgTable(
  "user_session",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refreshTokenHash: text("refresh_token_hash").notNull(),
    previousTokenHash: text("previous_token_hash"),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
  },
  (table) => [index("user_session_user_idx").on(table.userId), index("user_session_expires_idx").on(table.expiresAt)],
)

export const passwordTokens = pgTable(
  "password_token",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    purpose: text("purpose", { enum: ["invite", "reset"] }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("password_token_user_idx").on(table.userId)],
)

export const authRateLimits = pgTable("auth_rate_limit", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
})
