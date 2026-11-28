"use client"

import { BriefcaseIcon, Building2Icon, FileSignatureIcon, LandmarkIcon, ReceiptTextIcon, RepeatIcon, GitBranchIcon, LayoutDashboardIcon, type LucideIcon, MailIcon, ServerCogIcon, SettingsIcon, UsersIcon } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavIcon, NavSection } from "@/config/navigation"

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  projects: BriefcaseIcon,
  invoices: ReceiptTextIcon,
  services: RepeatIcon,
  people: UsersIcon,
  letters: FileSignatureIcon,
  clients: Building2Icon,
  settings: SettingsIcon,
  billing: LandmarkIcon,
  email: MailIcon,
  github: GitBranchIcon,
  system: ServerCogIcon,
}

export function NavMain({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()
  const { setOpenMobile } = useSidebar()

  return sections.map((section) => (
    <SidebarGroup key={section.label}>
      <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {section.items.map((item) => {
            const Icon = ICONS[item.icon]
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={isActive}
                  tooltip={item.title}
                  render={<Link href={item.href} aria-current={isActive ? "page" : undefined} onClick={() => setOpenMobile(false)} />}
                >
                  <Icon aria-hidden />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  ))
}
