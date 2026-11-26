"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { saveGithubAppSettings } from "@/server/modules/integrations/actions"
import type { GithubAppSettingsView } from "@/server/modules/integrations/config"

const keepNote = (saved: boolean, fallback: string) => (saved ? "Saved and encrypted. Leave empty to keep it." : fallback)

interface GithubAppFormProps {
  defaults: GithubAppSettingsView
  callbackUrl: string
  webhookUrl: string
}

export function GithubAppForm({ defaults, callbackUrl, webhookUrl }: GithubAppFormProps) {
  const [state, submit] = useActionState(saveGithubAppSettings, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (state?.ok) toast.success("GitHub App settings saved")
  }, [state])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2" autoComplete="off">
      <div className="space-y-1 rounded-lg bg-muted/50 p-4 text-sm sm:col-span-2">
        <p>Use these URLs when you create the GitHub App:</p>
        <p>
          Callback URL: <code className="font-mono break-all">{callbackUrl}</code>
        </p>
        <p>
          Webhook URL: <code className="font-mono break-all">{webhookUrl}</code>
        </p>
      </div>
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="github-app-id" label="App ID" errors={errors?.appId} description="Shown at the top of the GitHub App's settings page.">
        <Input id="github-app-id" name="appId" inputMode="numeric" defaultValue={defaults.appId} />
      </FormField>
      <FormField id="github-org" label="Organisation" errors={errors?.organization} description="Your organisation's login, e.g. acme.">
        <Input id="github-org" name="organization" defaultValue={defaults.organization} />
      </FormField>
      <FormField
        id="github-installation"
        label="Installation ID"
        errors={errors?.installationId}
        description="The number at the end of the URL after installing the app in your organisation."
      >
        <Input id="github-installation" name="installationId" inputMode="numeric" defaultValue={defaults.installationId} />
      </FormField>
      <FormField id="github-webhook-secret" label="Webhook secret" errors={errors?.webhookSecret} description={keepNote(defaults.hasWebhookSecret, "The secret you entered for the app's webhook.")}>
        <Input id="github-webhook-secret" name="webhookSecret" type="password" autoComplete="new-password" />
      </FormField>
      <FormField
        id="github-private-key"
        label="Private key"
        errors={errors?.privateKey}
        description={keepNote(defaults.hasPrivateKey, "Open the downloaded .pem file and paste its whole content, including the BEGIN and END lines.")}
        className="sm:col-span-2"
      >
        <Textarea id="github-private-key" name="privateKey" rows={4} className="font-mono text-xs" placeholder="-----BEGIN RSA PRIVATE KEY-----" />
      </FormField>
      <FormField id="github-client-id" label="Client ID" errors={errors?.clientId} description="Lets people connect their GitHub account from their profile.">
        <Input id="github-client-id" name="clientId" defaultValue={defaults.clientId} />
      </FormField>
      <FormField id="github-client-secret" label="Client secret" errors={errors?.clientSecret} description={keepNote(defaults.hasClientSecret, "Generate one on the app's settings page.")}>
        <Input id="github-client-secret" name="clientSecret" type="password" autoComplete="new-password" />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">Save GitHub App</SubmitButton>
      </div>
    </form>
  )
}
