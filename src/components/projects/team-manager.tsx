"use client"

import { Trash2Icon, UserPlusIcon } from "lucide-react"
import Link from "next/link"
import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PROJECT_ROLE_LABELS, type ProjectRole } from "@/config/roles"
import { useServerAction } from "@/hooks/use-server-action"
import { initials } from "@/lib/format"
import { toOptions } from "@/lib/options"
import { assignProjectMember, removeProjectMember } from "@/server/modules/projects/actions"
import type { ProjectMemberRow } from "@/server/modules/projects/queries"

const roleOptions = toOptions(PROJECT_ROLE_LABELS)

function AssignMemberForm({ projectId }: { projectId: string }) {
  const [state, submit] = useActionState(assignProjectMember, null)
  const formRef = useRef<HTMLFormElement>(null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (state?.ok) toast.success("Team updated")
  }, [state])

  return (
    <form ref={formRef} action={submit} className="grid gap-4 sm:grid-cols-[1fr_12rem_auto] sm:items-end">
      <input type="hidden" name="projectId" value={projectId} />
      <div className="sm:col-span-3">
        <FormAlert state={state} />
      </div>
      <FormField id="member-user" label="Person" required errors={errors?.userId}>
        <OptionCombobox id="member-user" name="userId" resource="people" placeholder="Search employees and freelancers…" />
      </FormField>
      <FormField id="member-role" label="Project role" required errors={errors?.role}>
        <OptionCombobox id="member-role" name="role" required options={roleOptions} defaultValue={roleOptions[1] ?? null} />
      </FormField>
      <SubmitButton pendingLabel="Adding…">
        <UserPlusIcon aria-hidden />
        Add to team
      </SubmitButton>
    </form>
  )
}

function RoleSelect({ projectId, member }: { projectId: string; member: ProjectMemberRow }) {
  const { isPending, run } = useServerAction()
  return (
    <OptionCombobox
      className="w-36"
      required
      disabled={isPending}
      options={roleOptions}
      value={roleOptions.find((option) => option.value === member.role) ?? null}
      onChange={(option) => {
        if (!option || option.value === member.role) return
        const form = new FormData()
        form.set("projectId", projectId)
        form.set("userId", member.userId)
        form.set("role", option.value)
        run(() => assignProjectMember(null, form), `${member.name} is now ${PROJECT_ROLE_LABELS[option.value as ProjectRole]}`)
      }}
    />
  )
}

export function TeamManager({ projectId, members, canManage }: { projectId: string; members: ProjectMemberRow[]; canManage: boolean }) {
  const { isPending, run } = useServerAction()

  return (
    <div className="flex flex-col gap-6">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Add team member</CardTitle>
            <CardDescription>GitHub access to this project&apos;s repositories is granted automatically based on the project role.</CardDescription>
          </CardHeader>
          <CardContent>
            <AssignMemberForm projectId={projectId} />
          </CardContent>
        </Card>
      ) : null}
      {members.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No one is assigned to this project yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border" aria-label="Project team">
          {members.map((member) => (
            <li key={member.userId} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9">
                  {member.image ? <AvatarImage src={member.image} alt="" /> : null}
                  <AvatarFallback>{initials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <Link href={`/people/${member.userId}`} className="block truncate font-medium hover:underline">
                    {member.name}
                  </Link>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {member.designation ?? member.email}
                    {member.systemRole === "freelancer" ? <Badge variant="outline">Freelancer</Badge> : null}
                    {member.githubUsername ? (
                      <span className="font-mono">@{member.githubUsername}</span>
                    ) : (
                      <span>GitHub not connected</span>
                    )}
                    {member.status === "inactive" ? <Badge variant="destructive">Inactive</Badge> : null}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage ? (
                  <>
                    <RoleSelect projectId={projectId} member={member} />
                    <ConfirmDialog
                      trigger={
                        <Button variant="ghost" size="icon-sm" disabled={isPending} aria-label={`Remove ${member.name}`}>
                          <Trash2Icon />
                        </Button>
                      }
                      title={`Remove ${member.name}?`}
                      description="They will lose access to this project and its GitHub repositories."
                      confirmLabel="Remove"
                      destructive
                      onConfirm={() => run(() => removeProjectMember({ projectId, userId: member.userId }), "Removed from project")}
                    />
                  </>
                ) : (
                  <Badge variant="secondary">{PROJECT_ROLE_LABELS[member.role]}</Badge>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
