import { bigint, boolean, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { githubAccessStatusEnum, githubLinkKindEnum, githubPermissionEnum, pullRequestStateEnum, repositoryLabelEnum } from "./enums"
import { id, timestamps } from "./helpers"
import { projects, tasks } from "./projects"

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

/*
 * Commits and pull requests whose message or title mentions a card reference
 * such as BRF-4. For a commit, external_id is the SHA; for a pull request, it is
 * the pull request number, so later events update the same row.
 */
export const taskGithubLinks = pgTable(
  "task_github_link",
  {
    id: id(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => githubRepositories.id, { onDelete: "cascade" }),
    kind: githubLinkKindEnum("kind").notNull(),
    externalId: text("external_id").notNull(),
    title: text("title").notNull(),
    url: text("url").notNull(),
    authorLogin: text("author_login"),
    state: pullRequestStateEnum("state"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("task_github_link_unique_idx").on(table.taskId, table.repositoryId, table.kind, table.externalId),
    index("task_github_link_repo_idx").on(table.repositoryId, table.kind, table.externalId),
  ],
)
