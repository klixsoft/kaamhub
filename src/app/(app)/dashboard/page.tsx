import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { PriorityBadge, ProjectStatusBadge } from "@/components/projects/badges"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PROJECT_STATUS_LABELS, PROJECT_STATUSES } from "@/config/domain"
import { formatDate, formatDateTime } from "@/lib/format"
import { requirePermission } from "@/server/auth/session"
import { getExpiringAccess, getMyOpenTasks, getProjectStatusCounts, getRenewals, getUpcomingDeadlines } from "@/server/modules/dashboard/queries"

export const metadata: Metadata = { title: "Dashboard" }

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{children}</p>
}

async function DashboardContent() {
  const user = await requirePermission("dashboard:view")
  const [myTasks, statusCounts, deadlines, expiring, renewals] = await Promise.all([
    getMyOpenTasks(user),
    getProjectStatusCounts(user),
    getUpcomingDeadlines(user),
    getExpiringAccess(user),
    getRenewals(user),
  ])
  const counts = new Map(statusCounts.map((row) => [row.status, row.count]))
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="flex flex-col gap-6">
      <section aria-label="Projects by status" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {PROJECT_STATUSES.map((status) => (
          <Link key={status} href={`/projects?status=${status}`} className="rounded-lg border p-4 transition-colors hover:bg-muted/50">
            <p className="text-xs text-muted-foreground">{PROJECT_STATUS_LABELS[status]}</p>
            <p className="text-2xl font-semibold tabular-nums">{counts.get(status) ?? 0}</p>
          </Link>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My open tasks</CardTitle>
            <CardDescription>Assigned to you and not done yet.</CardDescription>
          </CardHeader>
          <CardContent>
            {myTasks.length === 0 ? (
              <EmptyLine>Nothing assigned to you right now.</EmptyLine>
            ) : (
              <ul className="divide-y">
                {myTasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/projects/${task.projectId}/board`} className="min-w-0 hover:underline">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">
                        {task.projectCode}-{task.number}
                      </span>
                      <span className="text-sm">{task.title}</span>
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className={task.dueDate && task.dueDate < today ? "text-destructive" : undefined}>{formatDate(task.dueDate)}</span>
                      <PriorityBadge priority={task.priority} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming deadlines</CardTitle>
            <CardDescription>Open projects due within 30 days, including overdue ones.</CardDescription>
          </CardHeader>
          <CardContent>
            {deadlines.length === 0 ? (
              <EmptyLine>No deadlines in the next 30 days.</EmptyLine>
            ) : (
              <ul className="divide-y">
                {deadlines.map((project) => (
                  <li key={project.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/projects/${project.id}`} className="min-w-0 truncate text-sm hover:underline">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{project.code}</span>
                      {project.name}
                    </Link>
                    <span className="flex shrink-0 items-center gap-2 text-xs">
                      <span className={project.dueDate && project.dueDate < today ? "text-destructive" : "text-muted-foreground"}>
                        {formatDate(project.dueDate)}
                      </span>
                      <ProjectStatusBadge status={project.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {renewals.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Renewals due</CardTitle>
              <CardDescription>Services, domains and hosting expiring within 30 days.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {renewals.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={item.href} className="min-w-0 truncate hover:underline">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{item.projectCode}</span>
                      {item.title}
                      {item.detail ? <span className="text-muted-foreground"> · {item.detail}</span> : null}
                    </Link>
                    <span className={item.date < today ? "shrink-0 text-destructive" : "shrink-0 text-muted-foreground"}>{formatDate(item.date)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}

        {expiring.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Freelancer access ending soon</CardTitle>
              <CardDescription>Access ends automatically on these dates.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {expiring.map((person) => (
                  <li key={person.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <Link href={`/people/${person.id}`} className="hover:underline">
                      {person.name}
                    </Link>
                    <span className="text-muted-foreground">{formatDateTime(person.accessExpiresAt)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <PageHeader title="Dashboard" subtitle="Your work and the projects you can see.">
      <Suspense
        fallback={
          <div className="flex flex-col gap-6">
            <Skeleton className="h-20 w-full" />
            <div className="grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </PageHeader>
  )
}
