"use client"

import { AtSignIcon, BellIcon, CheckCheckIcon, MessageSquareIcon, UserPlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { NOTIFICATION_POLL_MS, type NotificationKind } from "@/config/notifications"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { markNotificationsRead } from "@/server/modules/notifications/actions"
import type { NotificationFeed } from "@/server/modules/notifications/queries"

const ICONS: Record<NotificationKind, typeof BellIcon> = {
  task_assigned: UserPlusIcon,
  mentioned: AtSignIcon,
  task_comment: MessageSquareIcon,
  client_comment: MessageSquareIcon,
}

type Feed = Omit<NotificationFeed, "items"> & { items: Array<Omit<NotificationFeed["items"][number], "createdAt" | "readAt"> & { createdAt: string; readAt: string | null }> }

export function NotificationBell() {
  const router = useRouter()
  const [feed, setFeed] = useState<Feed>({ items: [], unread: 0 })
  const [open, setOpen] = useState(false)
  const [, startTransition] = useTransition()

  const load = useCallback(async () => {
    const response = await fetch("/api/notifications", { cache: "no-store" }).catch(() => null)
    if (response?.ok) setFeed((await response.json()) as Feed)
  }, [])

  useEffect(() => {
    const initial = setTimeout(load, 0)
    const timer = setInterval(load, NOTIFICATION_POLL_MS)
    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)
    return () => {
      clearTimeout(initial)
      clearInterval(timer)
      window.removeEventListener("focus", onFocus)
    }
  }, [load])

  function openItem(item: Feed["items"][number]) {
    setOpen(false)
    startTransition(async () => {
      if (!item.readAt) await markNotificationsRead({ ids: [item.id] })
      await load()
    })
    router.push(item.url)
  }

  function markAll() {
    startTransition(async () => {
      await markNotificationsRead({})
      await load()
    })
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) void load()
      }}
    >
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon-sm" className="relative" aria-label={feed.unread > 0 ? `Notifications, ${feed.unread} unread` : "Notifications"} />
        }
      >
        <BellIcon />
        {feed.unread > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground" aria-hidden>
            {feed.unread > 99 ? "99+" : feed.unread}
          </span>
        ) : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {feed.unread > 0 ? (
            <Button variant="ghost" size="xs" onClick={markAll}>
              <CheckCheckIcon aria-hidden />
              Mark all as read
            </Button>
          ) : null}
        </div>
        {feed.items.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up. Assignments, mentions and comments on your cards appear here.</p>
        ) : (
          <ul className="max-h-[min(28rem,70svh)] divide-y overflow-y-auto">
            {feed.items.map((item) => {
              const Icon = ICONS[item.kind]
              return (
                <li key={item.id}>
                  <button type="button" onClick={() => openItem(item)} className={cn("flex w-full gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none", !item.readAt && "bg-primary/5")}>
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block", !item.readAt && "font-medium")}>{item.title}</span>
                      {item.body ? <span className="block truncate text-xs text-muted-foreground">{item.body}</span> : null}
                      <span className="block text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</span>
                    </span>
                    {!item.readAt ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  )
}
