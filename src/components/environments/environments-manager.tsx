"use client"

import { useState } from "react"
import { ExternalLinkIcon, GitBranchIcon, PencilIcon, PlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormDialog } from "@/components/forms/form-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ENVIRONMENT_KIND_LABELS } from "@/config/domain"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate, formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import { checkEnvironmentNow, deleteEnvironment } from "@/server/modules/environments/actions"
import type { CredentialRow } from "@/server/modules/environments/credentials"
import type { EnvironmentRow } from "@/server/modules/environments/queries"
import { CredentialsList } from "./credentials-list"
import { EnvironmentForm } from "./environment-form"
import { HealthIndicator } from "./health-indicator"

function ExpiryLine({ label, date, today }: { label: string; date: string | null; today: string }) {
  if (!date) return null
  const expired = date < today
  return (
    <span className={cn(expired && "font-medium text-destructive")}>
      {label} {expired ? "expired" : "expires"} {formatDate(date)}
    </span>
  )
}

interface EnvironmentsManagerProps {
  projectId: string
  environments: EnvironmentRow[]
  credentials: CredentialRow[]
  canManage: boolean
  today: string
}

function EnvironmentCard({ projectId, environment, canManage, today }: { projectId: string; environment: EnvironmentRow; canManage: boolean; today: string }) {
  const { isPending, run } = useServerAction()
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{environment.name}</span>
                    <Badge variant={environment.kind === "production" ? "default" : "secondary"}>{ENVIRONMENT_KIND_LABELS[environment.kind]}</Badge>
                  </p>
                  {environment.url ? (
                    <a
                      href={environment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      <span className="truncate">{environment.url}</span>
                      <ExternalLinkIcon className="size-3.5 shrink-0" aria-hidden />
                    </a>
                  ) : null}
                </div>
                <HealthIndicator environment={environment} />
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {environment.branch ? (
                  <>
                    <dt className="text-muted-foreground">Branch</dt>
                    <dd className="flex items-center gap-1 font-mono text-xs">
                      <GitBranchIcon className="size-3" aria-hidden />
                      {environment.branch}
                    </dd>
                  </>
                ) : null}
                {environment.hostingProvider ? (
                  <>
                    <dt className="text-muted-foreground">Hosting</dt>
                    <dd>{environment.hostingProvider}</dd>
                  </>
                ) : null}
                {environment.domainRegistrar ? (
                  <>
                    <dt className="text-muted-foreground">Registrar</dt>
                    <dd>{environment.domainRegistrar}</dd>
                  </>
                ) : null}
              </dl>

              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <ExpiryLine label="Domain" date={environment.domainExpiresOn} today={today} />
                <ExpiryLine label="Hosting" date={environment.hostingExpiresOn} today={today} />
                {environment.lastCheckedAt ? <span>Checked {formatDateTime(environment.lastCheckedAt)}</span> : null}
              </p>
              {environment.notes ? <p className="text-sm whitespace-pre-line text-muted-foreground">{environment.notes}</p> : null}

              <div className="mt-auto flex flex-wrap gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending || !environment.url}
                  onClick={() => run(() => checkEnvironmentNow({ environmentId: environment.id }), undefined)}
                >
                  <RefreshCwIcon className={isPending ? "animate-spin" : undefined} aria-hidden />
                  Check now
                </Button>
                {canManage ? (
                  <>
                    <FormDialog
                      title={`Edit ${environment.name}`}
                      trigger={
                        <Button variant="ghost" size="sm">
                          <PencilIcon aria-hidden />
                          Edit
                        </Button>
                      }
                    >
                      {(close) => <EnvironmentForm projectId={projectId} environment={environment} onSaved={close} />}
                    </FormDialog>
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="sm" className="text-destructive" disabled={isPending}>
                          <Trash2Icon aria-hidden />
                          Delete
                        </Button>
                      }
                      title={`Delete ${environment.name}?`}
                      description="Its URL, renewal dates and status history are removed."
                      confirmLabel="Delete"
                      destructive
                      onConfirm={() => run(() => deleteEnvironment({ environmentId: environment.id }), "Environment deleted")}
                    />
                  </>
                ) : null}
              </div>
    </div>
  )
}

export function EnvironmentsManager({ projectId, environments, credentials, canManage, today }: EnvironmentsManagerProps) {
  const [tab, setTab] = useState(environments[0]?.id ?? "")
  const activeTab = environments.some((environment) => environment.id === tab) ? tab : (environments[0]?.id ?? "")
  const credentialsByEnvironment = Map.groupBy(credentials, (credential) => credential.environmentId)

  return (
    <div className="flex flex-col gap-4">
      {canManage ? (
        <div className="flex justify-end">
          <FormDialog
            title="Add environment"
            trigger={
              <Button>
                <PlusIcon aria-hidden />
                Add environment
              </Button>
            }
          >
            {(close) => <EnvironmentForm projectId={projectId} onSaved={close} />}
          </FormDialog>
        </div>
      ) : null}

      {environments.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No environments yet. Add production, staging or development URLs to track their status, renewals and test credentials.
        </p>
      ) : (
        <Tabs value={activeTab} onValueChange={(value) => setTab(String(value))} className="gap-4">
          <TabsList className="h-auto max-w-full flex-wrap justify-start">
            {environments.map((environment) => (
              <TabsTrigger key={environment.id} value={environment.id} className="gap-2">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    !environment.url || environment.health === "unknown" ? "bg-zinc-400" : environment.health === "up" ? "bg-emerald-500" : "bg-red-500",
                  )}
                />
                {environment.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {environments.map((environment) => (
            <TabsContent key={environment.id} value={environment.id} className="flex flex-col gap-6">
              <EnvironmentCard projectId={projectId} environment={environment} canManage={canManage} today={today} />
              <CredentialsList
                projectId={projectId}
                environmentId={environment.id}
                credentials={credentialsByEnvironment.get(environment.id) ?? []}
                canManage={canManage}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
