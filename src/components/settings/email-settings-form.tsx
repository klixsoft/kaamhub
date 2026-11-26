"use client"

import { SendIcon } from "lucide-react"
import { type FormEvent, useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useServerAction } from "@/hooks/use-server-action"
import { saveEmailSettings, sendTestEmail } from "@/server/modules/integrations/actions"
import type { EmailSettingsView } from "@/server/modules/integrations/config"

interface EmailSettingsFormProps {
  defaults: EmailSettingsView
  testRecipient: string
}

export function EmailSettingsForm({ defaults, testRecipient }: EmailSettingsFormProps) {
  const [state, submit] = useActionState(saveEmailSettings, null)
  const [secure, setSecure] = useState(defaults.secure)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (state?.ok) toast.success("Email settings saved")
  }, [state])

  return (
    <div className="flex flex-col gap-6">
      <form action={submit} className="grid gap-4 sm:grid-cols-2" autoComplete="off">
        <div className="sm:col-span-2">
          <FormAlert state={state} />
        </div>
        <FormField id="email-host" label="SMTP server" errors={errors?.host} description="From your email provider, e.g. smtp.gmail.com. Leave empty to turn email off.">
          <Input id="email-host" name="host" defaultValue={defaults.host} placeholder="smtp.example.com" />
        </FormField>
        <FormField id="email-port" label="Port" required errors={errors?.port} description="587 for STARTTLS, 465 for TLS.">
          <Input id="email-port" name="port" type="number" inputMode="numeric" min={1} max={65535} defaultValue={defaults.port} required />
        </FormField>
        <FormField id="email-username" label="Username" errors={errors?.username} description="Usually your email address or an SMTP user from your provider.">
          <Input id="email-username" name="username" defaultValue={defaults.username} autoComplete="off" />
        </FormField>
        <FormField
          id="email-password"
          label="Password or API key"
          errors={errors?.password}
          description={defaults.hasPassword ? "Saved and encrypted. Leave empty to keep it." : "Encrypted before it is stored."}
        >
          <Input id="email-password" name="password" type="password" autoComplete="new-password" />
        </FormField>
        <FormField id="email-from-name" label="Sender name" errors={errors?.fromName} description="Shown as the sender, e.g. your company name.">
          <Input id="email-from-name" name="fromName" defaultValue={defaults.fromName} />
        </FormField>
        <FormField id="email-from-address" label="Sender address" errors={errors?.fromAddress} description="An address your provider allows you to send from.">
          <Input id="email-from-address" name="fromAddress" type="email" defaultValue={defaults.fromAddress} placeholder="no-reply@example.com" />
        </FormField>
        <label htmlFor="email-secure" className="flex items-start gap-3 rounded-lg border p-4 text-sm sm:col-span-2">
          <Switch id="email-secure" checked={secure} onCheckedChange={setSecure} />
          <input type="hidden" name="secure" value={String(secure)} />
          <span>
            <span className="block font-medium">Use TLS from the start</span>
            <span className="text-muted-foreground">Turn on for port 465. Leave off for port 587, which upgrades the connection with STARTTLS.</span>
          </span>
        </label>
        <div className="flex justify-end sm:col-span-2">
          <SubmitButton pendingLabel="Saving…">Save email settings</SubmitButton>
        </div>
      </form>
      <TestEmail defaultRecipient={testRecipient} enabled={Boolean(defaults.host)} />
    </div>
  )
}

function TestEmail({ defaultRecipient, enabled }: { defaultRecipient: string; enabled: boolean }) {
  const { isPending, run } = useServerAction()

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const to = String(new FormData(event.currentTarget).get("to") ?? "")
    run(() => sendTestEmail({ to }), `Test email sent to ${to}`)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-end">
      <FormField id="test-email-to" label="Send a test email to" required className="flex-1" description={enabled ? undefined : "Save an SMTP server first."}>
        <Input id="test-email-to" name="to" type="email" defaultValue={defaultRecipient} required disabled={!enabled} />
      </FormField>
      <Button type="submit" variant="outline" disabled={!enabled || isPending} className="sm:mb-0.5">
        <SendIcon aria-hidden />
        {isPending ? "Sending…" : "Send test"}
      </Button>
    </form>
  )
}
