"use client"

import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { FormDialog } from "@/components/forms/form-dialog"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { ButtonLink } from "@/components/layout/button-link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { shiftDate, startOfWeek } from "@/lib/dates"
import { formatMinutes } from "@/lib/duration"
import { formatDate } from "@/lib/format"
import type { WeekEntry } from "@/server/modules/time/queries"
import { TimeEntryForm } from "./time-entry-form"

interface WeekTimesheetProps {
  weekStart: string
  today: string
  entries: WeekEntry[]
  person: { id: string; name: string }
  people: Array<{ id: string; name: string }> | null
  isOwn: boolean
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function WeekTimesheet({ weekStart, today, entries, person, people, isOwn }: WeekTimesheetProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const days = DAY_NAMES.map((name, index) => {
    const date = shiftDate(weekStart, index)
    const dayEntries = entries.filter((entry) => entry.workDate === date)
    return { name, date, entries: dayEntries, minutes: dayEntries.reduce((total, entry) => total + entry.minutes, 0) }
  })
  const weekTotal = days.reduce((total, day) => total + day.minutes, 0)
  const billable = entries.filter((entry) => entry.billable).reduce((total, entry) => total + entry.minutes, 0)
  const link = (week: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("week", week)
    return `/timesheets?${params.toString()}`
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <ButtonLink href={link(shiftDate(weekStart, -7))} variant="outline" size="icon-sm" aria-label="Previous week">
            <ChevronLeftIcon />
          </ButtonLink>
          <ButtonLink href={link(shiftDate(weekStart, 7))} variant="outline" size="icon-sm" aria-label="Next week">
            <ChevronRightIcon />
          </ButtonLink>
          <p className="ml-2 text-sm font-medium">
            {formatDate(weekStart)} – {formatDate(shiftDate(weekStart, 6))}
          </p>
          {weekStart !== startOfWeek(today) ? (
            <Link href="/timesheets" className="ml-2 text-xs text-muted-foreground underline-offset-4 hover:underline">
              This week
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {people ? (
            <OptionCombobox
              id="timesheet-person"
              options={people.map((item) => ({ value: item.id, label: item.name }))}
              value={{ value: person.id, label: person.name }}
              onChange={(option) => {
                if (!option) return
                const params = new URLSearchParams(searchParams.toString())
                params.set("person", option.value)
                router.push(`/timesheets?${params.toString()}`)
              }}
              className="w-56"
            />
          ) : null}
          {isOwn ? (
            <FormDialog
              title="Log time"
              className="sm:max-w-xl"
              trigger={
                <Button>
                  <PlusIcon aria-hidden />
                  Log time
                </Button>
              }
            >
              {(close) => (
                <TimeEntryForm
                  today={today}
                  onSaved={() => {
                    close()
                    router.refresh()
                  }}
                />
              )}
            </FormDialog>
          ) : null}
        </div>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-muted-foreground">Total this week</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatMinutes(weekTotal)}</dd>
        </div>
        <div className="rounded-lg border p-4">
          <dt className="text-xs text-muted-foreground">Billable</dt>
          <dd className="text-2xl font-semibold tabular-nums">{formatMinutes(billable)}</dd>
        </div>
      </dl>

      <ol className="divide-y rounded-lg border">
        {days.map((day) => (
          <li key={day.date} className="p-3">
            <div className="flex items-baseline justify-between gap-2">
              <p className={day.date === today ? "font-semibold" : "font-medium"}>
                {day.name} <span className="text-sm font-normal text-muted-foreground">{formatDate(day.date)}</span>
              </p>
              <p className="text-sm tabular-nums text-muted-foreground">{day.minutes > 0 ? formatMinutes(day.minutes) : "—"}</p>
            </div>
            {day.entries.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
                {day.entries.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <Link
                        href={entry.taskNumber ? `/projects/${entry.projectId}/board?task=${entry.taskNumber}` : `/projects/${entry.projectId}/time`}
                        className="hover:underline"
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.projectCode}
                          {entry.taskNumber ? `-${entry.taskNumber}` : ""}
                        </span>{" "}
                        {entry.taskTitle ?? entry.projectName}
                      </Link>
                      {entry.note ? <span className="block truncate text-xs text-muted-foreground">{entry.note}</span> : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-2 tabular-nums">
                      {entry.billable ? null : <Badge variant="secondary">Not billable</Badge>}
                      {formatMinutes(entry.minutes)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  )
}
