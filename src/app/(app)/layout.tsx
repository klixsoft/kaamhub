import { Suspense } from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { AppSidebarProvider } from "@/components/layout/app-sidebar-provider"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { Sidebar, SidebarContent, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Skeleton } from "@/components/ui/skeleton"

function SidebarFallback() {
  return (
    <Sidebar collapsible="icon">
      <SidebarContent className="gap-2 p-2" aria-busy="true">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 w-full" />
        ))}
      </SidebarContent>
    </Sidebar>
  )
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <AppSidebarProvider>
      <Suspense fallback={<SidebarFallback />}>
        <AppSidebar />
      </Suspense>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <SidebarTrigger className="-ml-1" aria-label="Toggle navigation" />
          <Separator orientation="vertical" className="h-4" />
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <div id="main-content" className="flex flex-1 flex-col">
          {children}
        </div>
      </SidebarInset>
    </AppSidebarProvider>
  )
}
