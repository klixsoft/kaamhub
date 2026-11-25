import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core"
import { users } from "./auth"
import { clients } from "./clients"
import { priorityEnum, projectRoleEnum, projectStatusEnum, projectTypeEnum, taskTypeEnum, taskVisibilityEnum } from "./enums"
import { id, timestamps } from "./helpers"

export const projects = pgTable(
  "project",
  {
    id: id(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    status: projectStatusEnum("status").notNull().default("planning"),
    type: projectTypeEnum("type").notNull().default("software"),
    priority: priorityEnum("priority").notNull().default("medium"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    taskSequence: integer("task_sequence").notNull().default(0),
    managesInfrastructure: boolean("manages_infrastructure").notNull().default(false),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("project_code_idx").on(table.code),
    index("project_client_idx").on(table.clientId),
    index("project_status_idx").on(table.status),
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
    role: projectRoleEnum("role").notNull().default("developer"),
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
    ...timestamps,
  },
  (table) => [
    uniqueIndex("task_project_number_idx").on(table.projectId, table.number),
    index("task_column_position_idx").on(table.columnId, table.position),
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
