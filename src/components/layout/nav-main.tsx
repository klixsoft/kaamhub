"use client"

import {
  BriefcaseIcon,
  Building2Icon,
  ChevronRightIcon,
  ClockIcon,
  FileSignatureIcon,
  GitBranchIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  MailIcon,
  ReceiptTextIcon,
  RepeatIcon,
  ServerCogIcon,
  SettingsIcon,
  UsersIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import type { NavIcon, NavItem, NavSection } from "@/config/navigation"

const ICONS: Record<NavIcon, LucideIcon> = {
  dashboard: LayoutDashboardIcon,
  projects: BriefcaseIcon,
  timesheets: ClockIcon,
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

function isActiveRoute(pathname: string, item: NavItem): boolean {
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

function NavGroup({ section, pathname }: { section: NavSection; pathname: string }) {
  const { state, isMobile, setOpenMobile } = useSidebar()
  const containsActive = section.items.some((item) => isActiveRoute(pathname, item))
  const [expanded, setExpanded] = useState(!section.collapsedByDefault || containsActive)
  /*
   * In the icon-only rail the labels are hidden, so every section stays open
   * and its icons remain reachable. A section holding the current page is
   * always open so the active link is never hidden.
   */
  const open = (state === "collapsed" && !isMobile) || containsActive || expanded

  return (
    <Collapsible open={open} onOpenChange={setExpanded} render={<SidebarGroup />}>
      <SidebarGroupLabel
        render={
          <CollapsibleTrigger className="group/trigger w-full justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" disabled={containsActive} />
        }
      >
        {section.label}
        <ChevronRightIcon className="transition-transform group-data-[panel-open]/trigger:rotate-90 motion-reduce:transition-none" aria-hidden />
      </SidebarGroupLabel>
      <CollapsibleContent>
        <SidebarGroupContent>
          <SidebarMenu>
            {section.items.map((item) => {
              const Icon = ICONS[item.icon]
              const isActive = isActiveRoute(pathname, item)
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
      </CollapsibleContent>
    </Collapsible>
  )
}

export function NavMain({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname()
  return sections.map((section) => <NavGroup key={section.label} section={section} pathname={pathname} />)
}
