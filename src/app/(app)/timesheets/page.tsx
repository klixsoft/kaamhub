import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { WeekTimesheet } from "@/components/time/week-timesheet"
import { Skeleton } from "@/components/ui/skeleton"
import { isIsoDate, startOfWeek, todayIso } from "@/lib/dates"
import { can, requirePermission } from "@/server/auth/session"
import { timesheetPeople, weekEntries } from "@/server/modules/time/queries"

export const metadata: Metadata = { title: "Timesheets" }

async function Timesheet({ searchParams }: { searchParams: PageProps<"/timesheets">["searchParams"] }) {
  const user = await requirePermission("dashboard:view")
  const query = await searchParams
  const today = todayIso()
  const requestedWeek = typeof query.week === "string" && isIsoDate(query.week) ? query.week : today
  const weekStart = startOfWeek(requestedWeek)
  const canSeeOthers = can(user, "time:read_all")
  const people = canSeeOthers ? await timesheetPeople() : null
  const requestedPerson = typeof query.person === "string" ? people?.find((person) => person.id === query.person) : undefined
  const person = requestedPerson ?? { id: user.id, name: user.name }
  const entries = await weekEntries(person.id, weekStart)
  return <WeekTimesheet weekStart={weekStart} today={today} entries={entries} person={person} people={people} isOwn={person.id === user.id} />
}

export default function TimesheetsPage({ searchParams }: PageProps<"/timesheets">) {
  return (
    <PageHeader title="Timesheets" subtitle="Time logged per day. Log time here or from any card on a board." className="max-w-4xl">
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <Timesheet searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
