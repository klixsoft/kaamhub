"use client"

import {
  FileTextIcon,
  GitBranchIcon,
  GlobeIcon,
  KanbanSquareIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  type LucideIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export const PROJECT_NAV_ICONS = ["overview", "board", "requests", "documents", "team", "environments", "repositories", "settings"] as const
export type ProjectNavIcon = (typeof PROJECT_NAV_ICONS)[number]

const ICONS: Record<ProjectNavIcon, LucideIcon> = {
  overview: LayoutDashboardIcon,
  board: KanbanSquareIcon,
  requests: LifeBuoyIcon,
  documents: FileTextIcon,
  team: UsersIcon,
  environments: GlobeIcon,
  repositories: GitBranchIcon,
  settings: SettingsIcon,
}

export interface ProjectNavItem {
  href: string
  label: string
  icon: ProjectNavIcon
  exact?: boolean
}

export function ProjectNav({ items }: { items: ProjectNavItem[] }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Project sections" className="-mx-1 flex gap-1 overflow-x-auto pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:pb-0">
      {items.map((item) => {
        const Icon = ICONS[item.icon]
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
