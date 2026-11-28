"use client"

import { ClockIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { TimeEntryForm } from "@/components/time/time-entry-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate } from "@/lib/format"
import { formatMinutes } from "@/lib/duration"
import { deleteTimeEntry } from "@/server/modules/time/actions"
import type { TaskTime } from "@/server/modules/time/queries"

interface TimeSectionProps {
  taskId: string
  projectId: string
  time: TaskTime
  estimateHours: string | null
  canLog: boolean
  today: string
  onChange: () => void
}

export function TimeSection({ taskId, projectId, time, estimateHours, canLog, today, onChange }: TimeSectionProps) {
  const [mode, setMode] = useState<{ kind: "add" } | { kind: "edit"; id: string } | null>(null)
  const { isPending, run } = useServerAction()
  const estimate = estimateHours ? Number(estimateHours) * 60 : null

  return (
    <section aria-labelledby={`time-${taskId}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`time-${taskId}`} className="flex items-center gap-2 text-sm font-semibold">
          <ClockIcon className="size-4" aria-hidden />
          Time
          <span className="font-normal text-muted-foreground">
            {formatMinutes(time.totalMinutes)} logged{estimate ? ` of ${formatMinutes(estimate)} estimated` : ""}
          </span>
        </h3>
        {canLog && mode?.kind !== "add" ? (
          <Button variant="outline" size="sm" onClick={() => setMode({ kind: "add" })}>
            <PlusIcon aria-hidden />
            Log time
          </Button>
        ) : null}
      </div>
      {mode?.kind === "add" ? (
        <div className="rounded-lg border p-3">
          <TimeEntryForm
            projectId={projectId}
            taskId={taskId}
            today={today}
            onSaved={() => {
              setMode(null)
              onChange()
            }}
          />
        </div>
      ) : null}
      {time.entries.length > 0 ? (
        <ul className="divide-y rounded-lg border text-sm">
          {time.entries.map((entry) =>
            mode?.kind === "edit" && mode.id === entry.id ? (
              <li key={entry.id} className="p-3">
                <TimeEntryForm
                  entry={entry}
                  today={today}
                  onSaved={() => {
                    setMode(null)
                    onChange()
                  }}
                />
              </li>
            ) : (
              <li key={entry.id} className="flex items-center justify-between gap-2 p-2.5">
                <div className="min-w-0">
                  <p>
                    <span className="font-medium tabular-nums">{formatMinutes(entry.minutes)}</span> · {entry.userName} · {formatDate(entry.workDate)}
                    {entry.billable ? null : (
                      <Badge variant="secondary" className="ml-2">
                        Not billable
                      </Badge>
                    )}
                  </p>
                  {entry.note ? <p className="truncate text-xs text-muted-foreground">{entry.note}</p> : null}
                </div>
                {entry.canEdit ? (
                  <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon-sm" aria-label="Edit time entry" onClick={() => setMode({ kind: "edit", id: entry.id })}>
                      <PencilIcon />
                    </Button>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" aria-label="Delete time entry" disabled={isPending}>
                          <Trash2Icon />
                        </Button>
                      }
                      title="Delete this time entry?"
                      description={`${formatMinutes(entry.minutes)} on ${formatDate(entry.workDate)} by ${entry.userName}.`}
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => run(() => deleteTimeEntry({ entryId: entry.id }), "Time entry deleted", onChange)}
                    />
                  </div>
                ) : null}
              </li>
            ),
          )}
        </ul>
      ) : mode ? null : (
        <p className="text-sm text-muted-foreground">No time logged yet.</p>
      )}
    </section>
  )
}
