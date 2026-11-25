"use client"

import { ExternalLinkIcon, GitBranchIcon, LinkIcon, LockIcon, PlusIcon, UnlinkIcon } from "lucide-react"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormAlert } from "@/components/forms/form-alert"
import { FormDialog } from "@/components/forms/form-dialog"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { GITHUB_PERMISSION_LABELS, REPOSITORY_LABEL_NAMES } from "@/config/domain"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDateTime } from "@/lib/format"
import { toOptions } from "@/lib/options"
import { createProjectRepository, linkRepository, unlinkRepository } from "@/server/modules/projects/actions"
import type { ProjectRepositoryRow } from "@/server/modules/projects/queries"

const labelOptions = toOptions(REPOSITORY_LABEL_NAMES)
const STATUS_VARIANT = { active: "secondary", invited: "outline", pending: "outline", failed: "destructive" } as const
const STATUS_LABEL = { active: "Active", invited: "Invitation sent", pending: "Pending", failed: "Failed" } as const

function useSavedToast(state: { ok: boolean } | null, message: string, onSaved: () => void) {
  useEffect(() => {
    if (!state?.ok) return
    toast.success(message)
    onSaved()
  }, [state, message, onSaved])
}

function LinkRepositoryForm({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const [state, submit] = useActionState(linkRepository, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  useSavedToast(state, "Repository linked", onSaved)
  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <FormAlert state={state} />
      <FormField id="repo-select" label="Repository" required errors={errors?.repositoryId}>
        <OptionCombobox id="repo-select" name="repositoryId" resource="repositories" placeholder="Search organisation repositories…" />
      </FormField>
      <FormField id="repo-label" label="Purpose" required errors={errors?.label}>
        <OptionCombobox id="repo-label" name="label" required options={labelOptions} defaultValue={labelOptions[0] ?? null} />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Linking…">Link repository</SubmitButton>
      </div>
    </form>
  )
}

function CreateRepositoryForm({ projectId, onSaved }: { projectId: string; onSaved: () => void }) {
  const [state, submit] = useActionState(createProjectRepository, null)
  const [isPrivate, setIsPrivate] = useState(true)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  useSavedToast(state, "Repository created on GitHub", onSaved)
  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="projectId" value={projectId} />
      <FormAlert state={state} />
      <FormField id="new-repo-name" label="Repository name" required errors={errors?.name}>
        <Input id="new-repo-name" name="name" required className="font-mono" placeholder="client-web" />
      </FormField>
      <FormField id="new-repo-description" label="Description" errors={errors?.description}>
        <Input id="new-repo-description" name="description" />
      </FormField>
      <FormField id="new-repo-label" label="Purpose" required errors={errors?.label}>
        <OptionCombobox id="new-repo-label" name="label" required options={labelOptions} defaultValue={labelOptions[0] ?? null} />
      </FormField>
      <label className="flex items-center gap-3 text-sm" htmlFor="new-repo-private">
        <Switch id="new-repo-private" checked={isPrivate} onCheckedChange={setIsPrivate} />
        <input type="hidden" name="isPrivate" value={String(isPrivate)} />
        Private repository
      </label>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Creating…">Create repository</SubmitButton>
      </div>
    </form>
  )
}

interface RepositoryManagerProps {
  projectId: string
  repositories: ProjectRepositoryRow[]
  canLink: boolean
  canCreate: boolean
  githubConfigured: boolean
}

export function RepositoryManager({ projectId, repositories, canLink, canCreate, githubConfigured }: RepositoryManagerProps) {
  const { isPending, run } = useServerAction()

  return (
    <div className="flex flex-col gap-4">
      {!githubConfigured ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          The GitHub App is not configured yet, so repository access cannot be managed automatically. See the GitHub settings page.
        </p>
      ) : null}
      {canLink && githubConfigured ? (
        <div className="flex flex-wrap justify-end gap-2">
          <FormDialog
            title="Link repository"
            description="Team members get access automatically based on their project role."
            className="sm:max-w-md"
            trigger={
              <Button variant="outline">
                <LinkIcon aria-hidden />
                Link existing
              </Button>
            }
          >
            {(close) => <LinkRepositoryForm projectId={projectId} onSaved={close} />}
          </FormDialog>
          {canCreate ? (
            <FormDialog
              title="Create repository"
              className="sm:max-w-md"
              trigger={
                <Button>
                  <PlusIcon aria-hidden />
                  New repository
                </Button>
              }
            >
              {(close) => <CreateRepositoryForm projectId={projectId} onSaved={close} />}
            </FormDialog>
          ) : null}
        </div>
      ) : null}

      {repositories.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No repositories are linked to this project yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {repositories.map((repository) => (
            <li key={repository.id} className="rounded-lg border">
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <a
                    href={repository.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    {repository.isPrivate ? <LockIcon className="size-4" aria-label="Private" /> : null}
                    <span className="truncate font-mono">{repository.fullName}</span>
                    <ExternalLinkIcon className="size-3.5 text-muted-foreground" aria-hidden />
                  </a>
                  {repository.description ? <p className="text-sm text-muted-foreground">{repository.description}</p> : null}
                  <p className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <Badge variant="secondary">{REPOSITORY_LABEL_NAMES[repository.label]}</Badge>
                    {repository.defaultBranch ? (
                      <span className="flex items-center gap-1">
                        <GitBranchIcon className="size-3" aria-hidden />
                        {repository.defaultBranch}
                      </span>
                    ) : null}
                    {repository.pushedAt ? <span>Last push {formatDateTime(repository.pushedAt)}</span> : null}
                    {repository.isArchived ? <Badge variant="outline">Archived</Badge> : null}
                  </p>
                </div>
                {canLink ? (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="sm" disabled={isPending}>
                        <UnlinkIcon aria-hidden />
                        Unlink
                      </Button>
                    }
                    title={`Unlink ${repository.fullName}?`}
                    description="The repository stays on GitHub, but team members who only had access through this project lose it."
                    confirmLabel="Unlink"
                    destructive
                    onConfirm={() => run(() => unlinkRepository({ projectId, repositoryId: repository.id }), "Repository unlinked")}
                  />
                ) : null}
              </div>
              {repository.grants.length > 0 ? (
                <ul className="divide-y border-t text-sm" aria-label={`Access to ${repository.fullName}`}>
                  {repository.grants.map((grant) => (
                    <li key={grant.userId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
                      <span>
                        {grant.name} <span className="font-mono text-xs text-muted-foreground">@{grant.login}</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{GITHUB_PERMISSION_LABELS[grant.permission]}</span>
                        <Badge variant={STATUS_VARIANT[grant.status]} title={grant.error ?? undefined}>
                          {STATUS_LABEL[grant.status]}
                        </Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
