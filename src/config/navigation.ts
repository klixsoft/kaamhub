import type { Permission, SystemRole } from "./roles"
import { roleHasPermission } from "./roles"

export const NAV_ICONS = ["dashboard", "projects", "people", "clients", "settings", "github", "system"] as const
export type NavIcon = (typeof NAV_ICONS)[number]

export interface NavItem {
  title: string
  href: string
  icon: NavIcon
  permission?: Permission
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
      { title: "People", href: "/people", icon: "people", permission: "people:read" },
      { title: "Clients", href: "/clients", icon: "clients", permission: "clients:read" },
    ],
  },
  {
    label: "Administration",
    items: [
      { title: "Settings", href: "/settings/general", icon: "settings", permission: "settings:manage" },
      { title: "GitHub", href: "/settings/github", icon: "github", permission: "github:manage" },
      { title: "System", href: "/settings/system", icon: "system", permission: "system:update" },
    ],
  },
]

export function navigationFor(role: SystemRole): NavSection[] {
  return NAVIGATION.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || roleHasPermission(role, item.permission)),
  })).filter((section) => section.items.length > 0)
}

export function homePathFor(role: SystemRole): string {
  return roleHasPermission(role, "dashboard:view") ? "/dashboard" : "/projects"
}
