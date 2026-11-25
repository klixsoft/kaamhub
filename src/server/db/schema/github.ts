import { bigint, boolean, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { githubAccessStatusEnum, githubPermissionEnum, repositoryLabelEnum } from "./enums"
import { id, timestamps } from "./helpers"
import { projects } from "./projects"

export const githubRepositories = pgTable(
  "github_repository",
  {
    id: id(),
    githubId: bigint("github_id", { mode: "number" }).notNull().unique(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    fullName: text("full_name").notNull(),
    description: text("description"),
    isPrivate: boolean("is_private").notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    defaultBranch: text("default_branch"),
    htmlUrl: text("html_url").notNull(),
    pushedAt: timestamp("pushed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [index("github_repository_full_name_idx").on(table.fullName)],
)

export const projectRepositories = pgTable(
  "project_repository",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    label: repositoryLabelEnum("label").notNull().default("other"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.projectId, table.repositoryId] }),
    index("project_repository_repo_idx").on(table.repositoryId),
  ],
)

export const githubAccessGrants = pgTable(
  "github_access_grant",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    githubLogin: text("github_login").notNull(),
    permission: githubPermissionEnum("permission").notNull(),
    status: githubAccessStatusEnum("status").notNull().default("pending"),
    error: text("error"),
    ...timestamps,
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.repositoryId] }),
    index("github_access_grant_repo_idx").on(table.repositoryId),
  ],
)
