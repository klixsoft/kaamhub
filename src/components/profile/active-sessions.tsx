"use client"

import { LaptopIcon, SmartphoneIcon } from "lucide-react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDateTime } from "@/lib/format"
import { describeDevice } from "@/lib/user-agent"
import { endOtherSessions, endSession } from "@/server/modules/auth/actions"
import type { ActiveSession } from "@/server/auth/session-store"

interface ActiveSessionsProps {
  sessions: ActiveSession[]
  currentSessionId: string
}

export function ActiveSessions({ sessions, currentSessionId }: ActiveSessionsProps) {
  const { isPending, run } = useServerAction()
  const others = sessions.filter((session) => session.id !== currentSessionId)

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y rounded-lg border">
        {sessions.map((session) => {
          const device = describeDevice(session.userAgent)
          const Icon = device.mobile ? SmartphoneIcon : LaptopIcon
          const current = session.id === currentSessionId
          return (
            <li key={session.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 space-y-0.5">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {device.label}
                    {current ? <Badge variant="secondary">This device</Badge> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress ?? "Unknown address"} · Last active {formatDateTime(session.lastUsedAt)} · Signed in {formatDateTime(session.createdAt)}
                  </p>
                </div>
              </div>
              {current ? null : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => run(() => endSession({ sessionId: session.id }), "Signed out of that device")}
                >
                  Sign out
                </Button>
              )}
            </li>
          )
        })}
      </ul>
      {others.length > 0 ? (
        <div className="flex justify-end">
          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={isPending}>
                Sign out of all other devices
              </Button>
            }
            title="Sign out of all other devices?"
            description={`${others.length} other ${others.length === 1 ? "session" : "sessions"} will be signed out immediately. This device stays signed in.`}
            confirmLabel="Sign out others"
            destructive
            onConfirm={() => run(() => endOtherSessions({}), "Other devices signed out")}
          />
        </div>
      ) : null}
    </div>
  )
}
