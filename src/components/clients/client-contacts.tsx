"use client"

import { UserPlusIcon } from "lucide-react"
import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormDialog } from "@/components/forms/form-dialog"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { UserStatusBadge } from "@/components/people/badges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { UserStatus } from "@/config/domain"
import { useServerAction } from "@/hooks/use-server-action"
import { addClientContact, setClientContactAccess } from "@/server/modules/clients/actions"

interface Contact {
  userId: string
  name: string
  email: string
  status: UserStatus
  jobTitle: string | null
}

function AddContactForm({ clientId, onSaved }: { clientId: string; onSaved: () => void }) {
  const [state, submit] = useActionState(addClientContact, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success("Portal invitation sent")
    onSaved()
  }, [state, onSaved])

  return (
    <form action={submit} className="flex flex-col gap-4">
      <input type="hidden" name="clientId" value={clientId} />
      <FormAlert state={state} />
      <FormField id="contact-name" label="Full name" required errors={errors?.name}>
        <Input id="contact-name" name="name" required />
      </FormField>
      <FormField id="contact-email" label="Email" required errors={errors?.email}>
        <Input id="contact-email" name="email" type="email" required />
      </FormField>
      <FormField id="contact-title" label="Job title" errors={errors?.jobTitle}>
        <Input id="contact-title" name="jobTitle" />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Inviting…">Send invitation</SubmitButton>
      </div>
    </form>
  )
}

export function ClientContacts({ clientId, contacts, editable }: { clientId: string; contacts: Contact[]; editable: boolean }) {
  const { isPending, run } = useServerAction()

  return (
    <section className="flex flex-col gap-3" aria-labelledby="contacts-heading">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 id="contacts-heading" className="font-semibold">
            Portal contacts
          </h2>
          <p className="text-sm text-muted-foreground">People at this client who can follow their projects.</p>
        </div>
        {editable ? (
          <FormDialog
            title="Invite client contact"
            description="They will get an email to set a password and can then view this client's projects."
            className="sm:max-w-md"
            trigger={
              <Button variant="outline" size="sm">
                <UserPlusIcon aria-hidden />
                Invite
              </Button>
            }
          >
            {(close) => <AddContactForm clientId={clientId} onSaved={close} />}
          </FormDialog>
        ) : null}
      </div>
      {contacts.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No portal contacts yet.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {contacts.map((contact) => (
            <li key={contact.userId} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <p className="truncate font-medium">{contact.name}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {contact.email}
                  {contact.jobTitle ? ` · ${contact.jobTitle}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <UserStatusBadge status={contact.status} />
                {editable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      run(
                        () =>
                          setClientContactAccess({
                            clientId,
                            userId: contact.userId,
                            status: contact.status === "active" ? "inactive" : "active",
                          }),
                        contact.status === "active" ? "Portal access removed" : "Portal access restored",
                      )
                    }
                  >
                    {contact.status === "active" ? "Remove access" : "Restore access"}
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
