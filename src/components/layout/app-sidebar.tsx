import { LayersIcon } from "lucide-react"
import Link from "next/link"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { homePathFor, navigationFor } from "@/config/navigation"
import { SYSTEM_ROLE_LABELS } from "@/config/roles"
import { requireUser } from "@/server/auth/session"
import { getCompanyName, getModules } from "@/server/modules/settings/queries"
import { SidebarHydrated } from "./focus-mode"
import { NavMain } from "./nav-main"
import { UserMenu } from "./user-menu"

export async function AppSidebar() {
  const user = await requireUser()
  const [companyName, modules] = await Promise.all([getCompanyName(), getModules()])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href={homePathFor(user.role)} />}>
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <LayersIcon className="size-4" aria-hidden />
              </span>
              <span className="truncate font-semibold">{companyName}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain sections={navigationFor(user.role, modules)} />
      </SidebarContent>
      <SidebarFooter>
        <UserMenu user={{ name: user.name, email: user.email, image: user.image, roleLabel: SYSTEM_ROLE_LABELS[user.role] }} />
      </SidebarFooter>
      <SidebarRail />
      <SidebarHydrated />
    </Sidebar>
  )
}
