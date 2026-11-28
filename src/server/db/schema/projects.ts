import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./auth"
import { clients } from "./clients"
import { environmentHealthEnum, environmentKindEnum, priorityEnum, projectRoleEnum, projectStatusEnum, taskTypeEnum, taskVisibilityEnum } from "./enums"
import { id, timestamps } from "./helpers"

export const projectCategories = pgTable("project_category", {
  id: id(),
  name: text("name").notNull().unique(),
  ...timestamps,
})

export const projectStages = pgTable("project_stage", {
  id: id(),
  name: text("name").notNull().unique(),
  ...timestamps,
})

export const projects = pgTable(
  "project",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    status: projectStatusEnum("status").notNull().default("planning"),
    priority: priorityEnum("priority").notNull().default("medium"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    taskSequence: integer("task_sequence").notNull().default(0),
    categoryId: uuid("category_id").references(() => projectCategories.id, { onDelete: "set null" }),
    stageId: uuid("stage_id").references(() => projectStages.id, { onDelete: "set null" }),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("project_code_idx").on(table.code),
    index("project_client_idx").on(table.clientId),
    index("project_status_idx").on(table.status),
    index("project_category_idx").on(table.categoryId),
    index("project_stage_idx").on(table.stageId),
  ],
)

export const projectMembers = pgTable(
  "project_member",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: projectRoleEnum("role").notNull().default("member"),
    ...timestamps,
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] }), index("project_member_user_idx").on(table.userId)],
)

export const boardColumns = pgTable(
  "board_column",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    isDone: boolean("is_done").notNull().default(false),
    ...timestamps,
  },
  (table) => [index("board_column_project_idx").on(table.projectId, table.position)],
)

export const tasks = pgTable(
  "task",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    columnId: uuid("column_id")
      .notNull()
      .references(() => boardColumns.id, { onDelete: "restrict" }),
    number: integer("number").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    type: taskTypeEnum("type").notNull().default("task"),
    priority: priorityEnum("priority").notNull().default("medium"),
    visibility: taskVisibilityEnum("visibility").notNull().default("internal"),
    position: doublePrecision("position").notNull(),
    dueDate: date("due_date"),
    estimateHours: numeric("estimate_hours", { precision: 6, scale: 2 }),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    requestedById: text("requested_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("task_project_number_idx").on(table.projectId, table.number),
    index("task_column_position_idx").on(table.columnId, table.position),
    index("task_request_idx").on(table.projectId, table.requestedById),
  ],
)

export const taskAssignees = pgTable(
  "task_assignee",
  {
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.userId] }), index("task_assignee_user_idx").on(table.userId)],
)

export const projectEnvironments = pgTable(
  "project_environment",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: environmentKindEnum("kind").notNull().default("production"),
    url: text("url"),
    branch: text("branch"),
    hostingProvider: text("hosting_provider"),
    domainRegistrar: text("domain_registrar"),
    domainExpiresOn: date("domain_expires_on"),
    hostingExpiresOn: date("hosting_expires_on"),
    notes: text("notes"),
    health: environmentHealthEnum("health").notNull().default("unknown"),
    lastStatusCode: integer("last_status_code"),
    lastResponseMs: integer("last_response_ms"),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("project_environment_project_idx").on(table.projectId),
    index("project_environment_domain_expiry_idx").on(table.domainExpiresOn),
    index("project_environment_hosting_expiry_idx").on(table.hostingExpiresOn),
  ],
)

export const taskComments = pgTable(
  "task_comment",
  {
    id: id(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    visibility: taskVisibilityEnum("visibility").notNull().default("internal"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_comment_task_idx").on(table.taskId, table.createdAt)],
)

export const taskActivities = pgTable(
  "task_activity",
  {
    id: id(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    details: jsonb("details").$type<Record<string, string | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_activity_task_idx").on(table.taskId, table.createdAt)],
)

export const taskChecklistItems = pgTable(
  "task_checklist_item",
  {
    id: id(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    done: boolean("done").notNull().default(false),
    position: integer("position").notNull(),
    ...timestamps,
  },
  (table) => [index("task_checklist_item_task_idx").on(table.taskId, table.position)],
)

export const environmentCredentials = pgTable(
  "environment_credential",
  {
    id: id(),
    environmentId: uuid("environment_id")
      .notNull()
      .references(() => projectEnvironments.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    username: text("username"),
    loginUrl: text("login_url"),
    secretEncrypted: text("secret_encrypted").notNull(),
    notesEncrypted: text("notes_encrypted"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("environment_credential_environment_idx").on(table.environmentId)],
)

export const environmentCredentialAccess = pgTable(
  "environment_credential_access",
  {
    credentialId: uuid("credential_id")
      .notNull()
      .references(() => environmentCredentials.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.credentialId, table.userId] }), index("environment_credential_access_user_idx").on(table.userId)],
)

export const projectDocuments = pgTable(
  "project_document",
  {
    id: id(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    visibility: taskVisibilityEnum("visibility").notNull().default("internal"),
    uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("project_document_project_idx").on(table.projectId, table.createdAt)],
)

export const taskAttachments = pgTable(
  "task_attachment",
  {
    id: id(),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    storageKey: text("storage_key").notNull().unique(),
    visibility: taskVisibilityEnum("visibility").notNull().default("internal"),
    uploadedById: text("uploaded_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("task_attachment_task_idx").on(table.taskId, table.createdAt)],
)
