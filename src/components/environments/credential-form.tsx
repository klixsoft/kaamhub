"use client"

import { EyeIcon, EyeOffIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useServerAction } from "@/hooks/use-server-action"
import type { Option } from "@/lib/options"
import { createCredential, updateCredential } from "@/server/modules/environments/actions"
import type { CredentialRow } from "@/server/modules/environments/credentials"

interface CredentialFormProps {
  projectId: string
  environmentId: string
  credential?: CredentialRow
  onSaved: () => void
}

export function CredentialForm({ projectId, environmentId, credential, onSaved }: CredentialFormProps) {
  const { isPending, run } = useServerAction()
  const [showSecret, setShowSecret] = useState(false)
  const [people, setPeople] = useState<Option[]>(credential?.allowedUsers.map((user) => ({ value: user.id, label: user.name })) ?? [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values = {
      environmentId,
      label: String(form.get("label") ?? ""),
      username: String(form.get("username") ?? ""),
      loginUrl: String(form.get("loginUrl") ?? ""),
      notes: String(form.get("notes") ?? ""),
      secret: String(form.get("secret") ?? ""),
      userIds: people.map((person) => person.value),
    }
    run(
      () => (credential ? updateCredential({ ...values, credentialId: credential.id }) : createCredential(values)),
      credential ? "Credential updated" : "Credential added",
      onSaved,
    )
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" autoComplete="off">
      <FormField id="credential-label" label="Label" required description="e.g. Admin user, Test customer, Database">
        <Input id="credential-label" name="label" defaultValue={credential?.label} required />
      </FormField>
      <FormField id="credential-username" label="Username or email">
        <Input id="credential-username" name="username" defaultValue={credential?.username ?? ""} autoComplete="off" />
      </FormField>
      <FormField
        id="credential-secret"
        label="Password or secret"
        required={!credential}
        description={credential ? "Leave empty to keep the current one." : "Encrypted before it is stored."}
      >
        <InputGroup>
          <InputGroupInput id="credential-secret" name="secret" type={showSecret ? "text" : "password"} required={!credential} autoComplete="new-password" />
          <InputGroupAddon align="inline-end">
            <Button type="button" variant="ghost" size="icon-xs" onClick={() => setShowSecret((current) => !current)} aria-label={showSecret ? "Hide" : "Show"}>
              {showSecret ? <EyeOffIcon /> : <EyeIcon />}
            </Button>
          </InputGroupAddon>
        </InputGroup>
      </FormField>
      <FormField id="credential-url" label="Login URL">
        <Input id="credential-url" name="loginUrl" type="url" placeholder="https://" defaultValue={credential?.loginUrl ?? ""} />
      </FormField>
      <FormField
        id="credential-people"
        label="Who can see it"
        description="Leave empty to share with everyone on the project team. Project managers can always see it."
        className="sm:col-span-2"
      >
        <OptionCombobox
          id="credential-people"
          multiple
          resource="project-members"
          resourceParams={{ projectId }}
          value={people}
          onChange={setPeople}
          placeholder="Everyone on the project"
        />
      </FormField>
      <FormField id="credential-notes" label="Notes" description={credential?.hasNotes ? "Existing notes are replaced when you save." : "Encrypted, e.g. 2FA instructions."} className="sm:col-span-2">
        <Textarea id="credential-notes" name="notes" rows={2} />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pending={isPending} pendingLabel="Saving…">
          {credential ? "Save credential" : "Add credential"}
        </SubmitButton>
      </div>
    </form>
  )
}
