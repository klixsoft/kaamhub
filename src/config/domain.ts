export const ENGAGEMENT_TYPES = ["permanent", "probation", "contract", "intern", "freelancer"] as const
export type EngagementType = (typeof ENGAGEMENT_TYPES)[number]
export const ENGAGEMENT_TYPE_LABELS: Record<EngagementType, string> = {
  permanent: "Permanent",
  probation: "Probation",
  contract: "Contract",
  intern: "Intern",
  freelancer: "Freelancer",
}

export const USER_STATUSES = ["active", "inactive"] as const
export type UserStatus = (typeof USER_STATUSES)[number]
export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
}

export const CLIENT_STATUSES = ["active", "on_hold", "past"] as const
export type ClientStatus = (typeof CLIENT_STATUSES)[number]
export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  on_hold: "On hold",
  past: "Past",
}

export const PROJECT_STATUSES = ["planning", "in_progress", "on_hold", "completed", "cancelled"] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]
export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const
export type Priority = (typeof PRIORITIES)[number]
export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
}

export const TASK_TYPES = ["task", "feature", "bug", "improvement"] as const
export type TaskType = (typeof TASK_TYPES)[number]
export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  task: "Task",
  feature: "Feature",
  bug: "Bug",
  improvement: "Improvement",
}

export const TASK_VISIBILITIES = ["internal", "client"] as const
export type TaskVisibility = (typeof TASK_VISIBILITIES)[number]
export const TASK_VISIBILITY_LABELS: Record<TaskVisibility, string> = {
  internal: "Internal only",
  client: "Visible to client",
}

export const DEFAULT_BOARD_COLUMNS: ReadonlyArray<{ name: string; isDone: boolean }> = [
  { name: "Backlog", isDone: false },
  { name: "To do", isDone: false },
  { name: "In progress", isDone: false },
  { name: "Review", isDone: false },
  { name: "Done", isDone: true },
]

export const REPOSITORY_LABELS = ["frontend", "backend", "mobile", "infra", "docs", "other"] as const
export type RepositoryLabel = (typeof REPOSITORY_LABELS)[number]
export const REPOSITORY_LABEL_NAMES: Record<RepositoryLabel, string> = {
  frontend: "Frontend",
  backend: "Backend",
  mobile: "Mobile",
  infra: "Infrastructure",
  docs: "Docs",
  other: "Other",
}

export const GITHUB_PERMISSIONS = ["pull", "triage", "push", "maintain", "admin"] as const
export type GithubPermission = (typeof GITHUB_PERMISSIONS)[number]
export const GITHUB_PERMISSION_LABELS: Record<GithubPermission, string> = {
  pull: "Read",
  triage: "Triage",
  push: "Write",
  maintain: "Maintain",
  admin: "Admin",
}

export const GITHUB_ACCESS_STATUSES = ["pending", "invited", "active", "failed"] as const
export type GithubAccessStatus = (typeof GITHUB_ACCESS_STATUSES)[number]

export const ENVIRONMENT_KINDS = ["production", "staging", "development", "other"] as const
export type EnvironmentKind = (typeof ENVIRONMENT_KINDS)[number]
export const ENVIRONMENT_KIND_LABELS: Record<EnvironmentKind, string> = {
  production: "Production",
  staging: "Staging",
  development: "Development",
  other: "Other",
}

export const ENVIRONMENT_HEALTH = ["unknown", "up", "down"] as const
export type EnvironmentHealth = (typeof ENVIRONMENT_HEALTH)[number]
