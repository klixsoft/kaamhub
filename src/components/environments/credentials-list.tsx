"use client"

import { CopyIcon, ExternalLinkIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, LockIcon, PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormDialog } from "@/components/forms/form-dialog"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { deleteCredential, revealCredential } from "@/server/modules/environments/actions"
import type { CredentialRow } from "@/server/modules/environments/credentials"
import { CredentialForm } from "./credential-form"

async function copy(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(`${label} copied`)
  } catch {
    toast.error("Could not copy to the clipboard")
  }
}

function CredentialItem({ credential, projectId, canManage }: { credential: CredentialRow; projectId: string; canManage: boolean }) {
  const { isPending, run } = useServerAction()
  const [revealed, setRevealed] = useState<{ secret: string; notes: string | null } | null>(null)

  const reveal = (then?: (secret: string) => void) =>
    run(() => revealCredential({ credentialId: credential.id }), undefined, (data) => {
      setRevealed(data)
      then?.(data.secret)
    })

  return (
    <li className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 font-medium">
            <KeyRoundIcon className="size-4 text-muted-foreground" aria-hidden />
            {credential.label}
          </p>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {credential.allowedUsers.length > 0 ? (
              <>
                <LockIcon className="size-3" aria-hidden />
                Only {credential.allowedUsers.map((person) => person.name).join(", ")}
              </>
            ) : (
              <>
                <UsersIcon className="size-3" aria-hidden />
                Everyone on the project team
              </>
            )}
          </p>
        </div>
        {canManage ? (
          <div className="flex gap-1">
            <FormDialog
              title={`Edit ${credential.label}`}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Edit ${credential.label}`}>
                  <PencilIcon />
                </Button>
              }
            >
              {(close) => <CredentialForm projectId={projectId} environmentId={credential.environmentId} credential={credential} onSaved={close} />}
            </FormDialog>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${credential.label}`} disabled={isPending}>
                  <Trash2Icon />
                </Button>
              }
              title={`Delete ${credential.label}?`}
              description="The stored password and notes are removed permanently."
              confirmLabel="Delete"
              destructive
              onConfirm={() => run(() => deleteCredential({ credentialId: credential.id }), "Credential deleted")}
            />
          </div>
        ) : null}
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-[7rem_1fr]">
        {credential.username ? (
          <>
            <dt className="text-muted-foreground">Username</dt>
            <dd className="flex items-center gap-1 font-mono text-xs break-all">
              {credential.username}
              <Button variant="ghost" size="icon-xs" onClick={() => copy(credential.username ?? "", "Username")} aria-label="Copy username">
                <CopyIcon />
              </Button>
            </dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">Password</dt>
        <dd className="flex flex-wrap items-center gap-1 font-mono text-xs">
          <span className="break-all">{revealed ? revealed.secret : "••••••••••"}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isPending}
            onClick={() => (revealed ? setRevealed(null) : reveal())}
            aria-label={revealed ? "Hide password" : "Reveal password"}
          >
            {revealed ? <EyeOffIcon /> : <EyeIcon />}
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isPending}
            onClick={() => (revealed ? copy(revealed.secret, "Password") : reveal((secret) => copy(secret, "Password")))}
            aria-label="Copy password"
          >
            <CopyIcon />
          </Button>
        </dd>
        {credential.loginUrl ? (
          <>
            <dt className="text-muted-foreground">Login URL</dt>
            <dd>
              <a href={credential.loginUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 break-all underline-offset-4 hover:underline">
                {credential.loginUrl}
                <ExternalLinkIcon className="size-3 shrink-0" aria-hidden />
              </a>
            </dd>
          </>
        ) : null}
        {revealed?.notes ? (
          <>
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap">{revealed.notes}</dd>
          </>
        ) : credential.hasNotes && !revealed ? (
          <>
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="text-xs text-muted-foreground">Hidden. Reveal the password to show notes.</dd>
          </>
        ) : null}
      </dl>
    </li>
  )
}

interface CredentialsListProps {
  projectId: string
  environmentId: string
  credentials: CredentialRow[]
  canManage: boolean
}

export function CredentialsList({ projectId, environmentId, credentials, canManage }: CredentialsListProps) {
  return (
    <section aria-labelledby={`credentials-${environmentId}`} className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 id={`credentials-${environmentId}`} className="flex items-center gap-2 font-semibold">
          <KeyRoundIcon className="size-4" aria-hidden />
          Credentials
        </h3>
        {canManage ? (
          <FormDialog
            title="Add credential"
            description="Test accounts and logins for this environment. The password is encrypted before it is stored."
            trigger={
              <Button variant="outline" size="sm">
                <PlusIcon aria-hidden />
                Add credential
              </Button>
            }
          >
            {(close) => <CredentialForm projectId={projectId} environmentId={environmentId} onSaved={close} />}
          </FormDialog>
        ) : null}
      </div>
      {credentials.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No credentials for this environment, or none shared with you.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {credentials.map((credential) => (
            <CredentialItem key={credential.id} credential={credential} projectId={projectId} canManage={canManage} />
          ))}
        </ul>
      )}
    </section>
  )
}
