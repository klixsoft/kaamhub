import { pgEnum } from "drizzle-orm/pg-core"
import {
  BILLING_CYCLES,
  INVOICE_STATUSES,
  PAYMENT_METHODS,
  SERVICE_STATUSES,
  TAX_KINDS,
} from "@/config/finance"
import { PROJECT_ROLES, SYSTEM_ROLES } from "@/config/roles"
import {
  CLIENT_STATUSES,
  ENGAGEMENT_TYPES,
  ENVIRONMENT_HEALTH,
  ENVIRONMENT_KINDS,
  GITHUB_ACCESS_STATUSES,
  GITHUB_PERMISSIONS,
  PRIORITIES,
  PROJECT_STATUSES,
  REPOSITORY_LABELS,
  TASK_TYPES,
  TASK_VISIBILITIES,
  USER_STATUSES,
} from "@/config/domain"

export const systemRoleEnum = pgEnum("system_role", SYSTEM_ROLES)
export const userStatusEnum = pgEnum("user_status", USER_STATUSES)
export const engagementTypeEnum = pgEnum("engagement_type", ENGAGEMENT_TYPES)
export const clientStatusEnum = pgEnum("client_status", CLIENT_STATUSES)
export const projectStatusEnum = pgEnum("project_status", PROJECT_STATUSES)
export const projectRoleEnum = pgEnum("project_role", PROJECT_ROLES)
export const priorityEnum = pgEnum("priority", PRIORITIES)
export const taskTypeEnum = pgEnum("task_type", TASK_TYPES)
export const taskVisibilityEnum = pgEnum("task_visibility", TASK_VISIBILITIES)
export const repositoryLabelEnum = pgEnum("repository_label", REPOSITORY_LABELS)
export const githubPermissionEnum = pgEnum("github_permission", GITHUB_PERMISSIONS)
export const githubAccessStatusEnum = pgEnum("github_access_status", GITHUB_ACCESS_STATUSES)

export const taxKindEnum = pgEnum("tax_kind", TAX_KINDS)
export const invoiceStatusEnum = pgEnum("invoice_status", INVOICE_STATUSES)
export const paymentMethodEnum = pgEnum("payment_method", PAYMENT_METHODS)
export const billingCycleEnum = pgEnum("billing_cycle", BILLING_CYCLES)
export const serviceStatusEnum = pgEnum("service_status", SERVICE_STATUSES)
export const environmentKindEnum = pgEnum("environment_kind", ENVIRONMENT_KINDS)
export const environmentHealthEnum = pgEnum("environment_health", ENVIRONMENT_HEALTH)
