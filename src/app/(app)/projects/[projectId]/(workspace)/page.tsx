import { ArrowRightIcon, ExternalLinkIcon, LockIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import type { ReactNode } from "react"
import { Suspense } from "react"
import { HealthIndicator } from "@/components/environments/health-indicator"
import { ButtonLink } from "@/components/layout/button-link"
import { PriorityBadge } from "@/components/projects/badges"
import { ProgressBar } from "@/components/projects/progress-bar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { BILLING_CYCLE_LABELS } from "@/config/finance"
import { PROJECT_ROLE_LABELS } from "@/config/roles"
import { formatDate, initials } from "@/lib/format"
import { formatMoney } from "@/lib/money"
import { can } from "@/server/auth/session"
import { listProjectEnvironments } from "@/server/modules/environments/queries"
import { getColumnCounts } from "@/server/modules/projects/board"
import { loadProjectContext } from "@/server/modules/projects/context"
import { listProjectMembers, listProjectRepositories } from "@/server/modules/projects/queries"
import { listProjectServices } from "@/server/modules/services/queries"
import { currencyFormatOf, getModules, getSettings } from "@/server/modules/settings/queries"

export const metadata: Metadata = { title: "Project overview" }

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{children}</dd>
    </div>
  )
}

function SectionLink({ href, label }: { href: string; label: string }) {
  return (
    <ButtonLink href={href} variant="ghost" size="sm">
      {label}
      <ArrowRightIcon aria-hidden />
    </ButtonLink>
  )
}

const empty = (text: string) => <p className="text-sm text-muted-foreground">{text}</p>

async function Overview({ params }: { params: PageProps<"/projects/[projectId]">["params"] }) {
  const { projectId } = await params
  const { user, access, project } = await loadProjectContext(projectId)
  const modules = await getModules()
  const internal = !access.isClientViewer
  const showServices = modules.services && can(user, "finance:read")
  const base = `/projects/${project.id}`

  const [columns, members, environments, repositories, services, billing] = await Promise.all([
    getColumnCounts(access),
    internal ? listProjectMembers(project.id) : Promise.resolve([]),
    internal && modules.environments ? listProjectEnvironments(project.id) : Promise.resolve([]),
    internal && modules.github ? listProjectRepositories(project.id) : Promise.resolve([]),
    showServices ? listProjectServices(project.id) : Promise.resolve([]),
    showServices ? getSettings("billing") : Promise.resolve(null),
  ])
  const totalTasks = columns.reduce((sum, column) => sum + column.count, 0)
  const doneTasks = columns.filter((column) => column.isDone).reduce((sum, column) => sum + column.count, 0)
  const currency = billing ? currencyFormatOf(billing) : null

  return (
    <>
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Fact label="Progress">
          <ProgressBar done={doneTasks} total={totalTasks} />
          <span className="mt-1 block text-xs font-normal text-muted-foreground">
            {doneTasks} of {totalTasks} tasks done
          </span>
        </Fact>
        <Fact label="Stage">{project.stageName ?? "Not set"}</Fact>
        <Fact label="Deadline">{formatDate(project.dueDate)}</Fact>
        <Fact label="Priority">
          <PriorityBadge priority={project.priority} />
        </Fact>
      </dl>

      {project.description ? (
        <Card>
          <CardHeader>
            <CardTitle>About this project</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-line">{project.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Board</CardTitle>
            <CardDescription>Tasks by column{access.isClientViewer ? " (shared with you)" : ""}.</CardDescription>
            <CardAction>
              <SectionLink href={`${base}/board`} label="Open board" />
            </CardAction>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {columns.map((column) => (
                <li key={column.id} className="flex justify-between py-2 text-sm">
                  <span>{column.name}</span>
                  <span className="tabular-nums text-muted-foreground">{column.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {internal ? (
          <Card>
            <CardHeader>
              <CardTitle>Team</CardTitle>
              <CardDescription>{members.length === 1 ? "1 person" : `${members.length} people`}</CardDescription>
              <CardAction>
                <SectionLink href={`${base}/team`} label="Manage" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {members.length === 0
                ? empty("No one is assigned yet.")
                : (
                    <ul className="flex flex-col gap-3">
                      {members.slice(0, 6).map((member) => (
                        <li key={member.userId} className="flex items-center gap-3 text-sm">
                          <Avatar className="size-8">
                            {member.image ? <AvatarImage src={member.image} alt="" /> : null}
                            <AvatarFallback>{initials(member.name)}</AvatarFallback>
                          </Avatar>
                          <span className="flex-1 truncate">{member.name}</span>
                          <span className="text-xs text-muted-foreground">{PROJECT_ROLE_LABELS[member.role]}</span>
                        </li>
                      ))}
                    </ul>
                  )}
            </CardContent>
          </Card>
        ) : null}

        {internal && modules.environments ? (
          <Card>
            <CardHeader>
              <CardTitle>Environments</CardTitle>
              <CardDescription>Live status of each URL.</CardDescription>
              <CardAction>
                <SectionLink href={`${base}/environments`} label="View all" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {environments.length === 0
                ? empty("No environments yet.")
                : (
                    <ul className="divide-y">
                      {environments.map((environment) => (
                        <li key={environment.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="block font-medium">{environment.name}</span>
                            {environment.url ? (
                              <a
                                href={environment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:underline"
                              >
                                {environment.url}
                                <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
                              </a>
                            ) : null}
                          </span>
                          <HealthIndicator environment={environment} />
                        </li>
                      ))}
                    </ul>
                  )}
            </CardContent>
          </Card>
        ) : null}

        {internal && modules.github ? (
          <Card>
            <CardHeader>
              <CardTitle>Repositories</CardTitle>
              <CardDescription>Linked GitHub repositories.</CardDescription>
              <CardAction>
                <SectionLink href={`${base}/repositories`} label="Manage" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {repositories.length === 0
                ? empty("No repositories linked.")
                : (
                    <ul className="divide-y">
                      {repositories.map((repository) => (
                        <li key={repository.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <a href={repository.htmlUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-1.5 font-mono hover:underline">
                            {repository.isPrivate ? <LockIcon className="size-3.5 shrink-0" aria-label="Private" /> : null}
                            <span className="truncate">{repository.fullName}</span>
                          </a>
                          <span className="text-xs text-muted-foreground">{repository.grants.length} with access</span>
                        </li>
                      ))}
                    </ul>
                  )}
            </CardContent>
          </Card>
        ) : null}

        {showServices && currency ? (
          <Card>
            <CardHeader>
              <CardTitle>Recurring services</CardTitle>
              <CardDescription>Billed to this project&apos;s client on a schedule.</CardDescription>
              <CardAction>
                <SectionLink href={`/services?project=${project.id}`} label="Open services" />
              </CardAction>
            </CardHeader>
            <CardContent>
              {services.length === 0
                ? empty("No recurring services for this project.")
                : (
                    <ul className="divide-y">
                      {services.map((service) => (
                        <li key={service.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{service.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {BILLING_CYCLE_LABELS[service.billingCycle]} · next bill {formatDate(service.nextBillingOn)}
                            </span>
                          </span>
                          <span className="tabular-nums">{formatMoney(service.amount, currency)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
            </CardContent>
          </Card>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        Started {formatDate(project.startDate)}
        {project.categoryName ? ` · ${project.categoryName}` : ""} · Last updated {formatDate(project.updatedAt)}
        {access.canManage ? (
          <>
            {" · "}
            <Link href={`${base}/settings`} className="underline-offset-4 hover:underline">
              Edit project
            </Link>
          </>
        ) : null}
      </p>
    </>
  )
}

export default function ProjectOverviewPage({ params }: PageProps<"/projects/[projectId]">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      }
    >
      <Overview params={params} />
    </Suspense>
  )
}
