export const SYSTEM_ROLES = [
  "super_admin",
  "admin",
  "hr",
  "project_manager",
  "employee",
  "freelancer",
  "client",
] as const

export type SystemRole = (typeof SYSTEM_ROLES)[number]

export const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  hr: "HR",
  project_manager: "Project Manager",
  employee: "Employee",
  freelancer: "Freelancer",
  client: "Client",
}

export const PROJECT_ROLES = ["manager", "developer", "designer", "qa", "viewer"] as const

export type ProjectRole = (typeof PROJECT_ROLES)[number]

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  manager: "Manager",
  developer: "Developer",
  designer: "Designer",
  qa: "QA",
  viewer: "Viewer",
}

export const PERMISSIONS = [
  "dashboard:view",
  "people:read",
  "people:write",
  "clients:read",
  "clients:write",
  "projects:read_all",
  "projects:create",
  "projects:manage_all",
  "finance:read",
  "finance:write",
  "settings:manage",
  "github:manage",
  "system:update",
  "audit:read",
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ALL_PERMISSIONS: readonly Permission[] = PERMISSIONS

export const ROLE_PERMISSIONS: Record<SystemRole, readonly Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS.filter((permission) => permission !== "system:update"),
  hr: ["dashboard:view", "people:read", "people:write", "clients:read"],
  project_manager: ["dashboard:view", "people:read", "clients:read", "projects:create"],
  employee: ["dashboard:view"],
  freelancer: ["dashboard:view"],
  client: [],
}

export const INTERNAL_ROLES: readonly SystemRole[] = SYSTEM_ROLES.filter((role) => role !== "client")

export function roleHasPermission(role: SystemRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export function isAssignableRole(actorRole: SystemRole, targetRole: SystemRole): boolean {
  if (actorRole === "super_admin") return true
  return targetRole !== "super_admin"
}
