import { date, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { users } from "./auth"
import { engagementTypeEnum } from "./enums"
import { id, timestamps } from "./helpers"

export const departments = pgTable("department", {
  id: id(),
  name: text("name").notNull().unique(),
  ...timestamps,
})

export const designations = pgTable("designation", {
  id: id(),
  name: text("name").notNull().unique(),
  ...timestamps,
})

export const memberProfiles = pgTable(
  "member_profile",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    employeeCode: text("employee_code"),
    phone: text("phone"),
    engagementType: engagementTypeEnum("engagement_type").notNull().default("permanent"),
    departmentId: uuid("department_id").references(() => departments.id, { onDelete: "set null" }),
    designationId: uuid("designation_id").references(() => designations.id, { onDelete: "set null" }),
    managerId: text("manager_id").references(() => users.id, { onDelete: "set null" }),
    joinedOn: date("joined_on"),
    engagementEndsOn: date("engagement_ends_on"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("member_profile_employee_code_idx").on(table.employeeCode),
    index("member_profile_department_idx").on(table.departmentId),
    index("member_profile_engagement_idx").on(table.engagementType),
  ],
)
