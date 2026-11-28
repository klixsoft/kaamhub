import type { ModuleKey, ModuleState } from "./modules"
import type { Permission, SystemRole } from "./roles"
import { roleHasPermission } from "./roles"

export const NAV_ICONS = ["dashboard", "projects", "invoices", "services", "people", "letters", "clients", "settings", "billing", "email", "github", "system"] as const
export type NavIcon = (typeof NAV_ICONS)[number]

export interface NavItem {
  title: string
  href: string
  icon: NavIcon
  permission?: Permission
  clientVisible?: boolean
  module?: ModuleKey
}

export interface NavSection {
  label: string
  items: NavItem[]
}

const NAVIGATION: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: "dashboard", permission: "dashboard:view" },
      { title: "Projects", href: "/projects", icon: "projects" },
      { title: "Invoices", href: "/invoices", icon: "invoices", permission: "finance:read", clientVisible: true, module: "invoices" },
      { title: "Services", href: "/services", icon: "services", permission: "finance:read", module: "services" },
      { title: "People", href: "/people", icon: "people", permission: "people:read" },
      { title: "Letters", href: "/letters", icon: "letters", permission: "letters:manage" },
      { title: "Clients", href: "/clients", icon: "clients", permission: "clients:read", module: "clients" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Settings", href: "/settings/general", icon: "settings", permission: "settings:manage" },
      { title: "Billing", href: "/settings/billing", icon: "billing", permission: "settings:manage", module: "invoices" },
      { title: "Email", href: "/settings/email", icon: "email", permission: "system:update" },
      { title: "GitHub", href: "/settings/github", icon: "github", permission: "github:manage", module: "github" },
      { title: "System", href: "/settings/system", icon: "system", permission: "system:update" },
    ],
  },
]

export function navigationFor(role: SystemRole, modules: ModuleState): NavSection[] {
  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.module || modules[item.module]) &&
        (!item.permission || roleHasPermission(role, item.permission) || (role === "client" && item.clientVisible === true)),
    ),
  })).filter((section) => section.items.length > 0)
}

export function homePathFor(role: SystemRole): string {
  return roleHasPermission(role, "dashboard:view") ? "/dashboard" : "/projects"
}
