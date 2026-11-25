"use client"

import type { ReactNode } from "react"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useFocusMode } from "./focus-mode"

export function AppSidebarProvider({ children }: { children: ReactNode }) {
  return <SidebarProvider overlay={useFocusMode()}>{children}</SidebarProvider>
}
