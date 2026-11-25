"use client"

import { ChevronsUpDownIcon, LogOutIcon, MoonIcon, SunIcon, UserIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"
import { initials } from "@/lib/format"

interface UserMenuProps {
  user: { name: string; email: string; image: string | null; roleLabel: string }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  async function signOut() {
    await authClient.signOut()
    router.replace("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}>
            <Avatar className="size-8 rounded-lg">
              {user.image ? <AvatarImage src={user.image} alt="" /> : null}
              <AvatarFallback className="rounded-lg">{initials(user.name)}</AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.roleLabel}</span>
            </span>
            <ChevronsUpDownIcon className="ml-auto size-4" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="min-w-56" side="top" align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-medium text-foreground">{user.name}</span>
                <span className="block truncate text-xs">{user.email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>
              <UserIcon aria-hidden />
              My profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
              {resolvedTheme === "dark" ? <SunIcon aria-hidden /> : <MoonIcon aria-hidden />}
              {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOutIcon aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
