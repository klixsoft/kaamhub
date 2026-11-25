"use client"

import { RefreshCwIcon } from "lucide-react"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { GITHUB_PERMISSION_LABELS } from "@/config/domain"
import { PROJECT_ROLE_LABELS, PROJECT_ROLES } from "@/config/roles"
import { useServerAction } from "@/hooks/use-server-action"
import { toOptions } from "@/lib/options"
import { saveGithubSettings, syncGithubRepositories } from "@/server/modules/settings/actions"
import type { GithubSettings } from "@/server/modules/settings/schema"

const permissionOptions = toOptions(GITHUB_PERMISSION_LABELS)

export function GithubPermissionForm({ defaults }: { defaults: GithubSettings }) {
  const [state, submit] = useActionState(saveGithubSettings, null)
  const [removeAccess, setRemoveAccess] = useState(defaults.removeAccessOnUnassign)

  useEffect(() => {
    if (state?.ok) toast.success("GitHub access rules saved. Existing access is being updated.")
  }, [state])

  return (
    <form action={submit} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECT_ROLES.map((role) => (
          <FormField key={role} id={`permission-${role}`} label={PROJECT_ROLE_LABELS[role]} required>
            <OptionCombobox
              id={`permission-${role}`}
              name={role}
              required
              options={permissionOptions}
              defaultValue={permissionOptions.find((option) => option.value === defaults.projectRolePermissions[role]) ?? null}
            />
          </FormField>
        ))}
      </div>
      <label htmlFor="removeAccessOnUnassign" className="flex items-start gap-3 text-sm">
        <Switch id="removeAccessOnUnassign" checked={removeAccess} onCheckedChange={setRemoveAccess} />
        <input type="hidden" name="removeAccessOnUnassign" value={String(removeAccess)} />
        <span>
          <span className="block font-medium">Remove access automatically</span>
          <span className="text-muted-foreground">Revoke repository access when someone leaves a project, is deactivated or their freelancer access expires.</span>
        </span>
      </label>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save access rules</SubmitButton>
      </div>
    </form>
  )
}

export function SyncRepositoriesButton() {
  const { isPending, run } = useServerAction()
  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() =>
        run(
          () => syncGithubRepositories({}),
          undefined,
          (result) => toast.success(`${result.count} repositories synced`),
        )
      }
    >
      <RefreshCwIcon className={isPending ? "animate-spin" : undefined} aria-hidden />
      {isPending ? "Syncing…" : "Sync repositories"}
    </Button>
  )
}
