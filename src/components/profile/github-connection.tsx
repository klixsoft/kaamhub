"use client"

import { GitBranchIcon } from "lucide-react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { disconnectGithub } from "@/server/modules/profile/actions"

const RESULT_MESSAGES: Record<string, { text: string; error: boolean }> = {
  connected: { text: "Your GitHub account is connected.", error: false },
  failed: { text: "We couldn’t connect your GitHub account. Please try again.", error: true },
  taken: { text: "That GitHub account is already connected to another person in this workspace.", error: true },
  unavailable: { text: "GitHub account linking has not been set up by your administrator.", error: true },
}

interface GithubConnectionProps {
  username: string | null
  available: boolean
  result: string | null
}

export function GithubConnection({ username, available, result }: GithubConnectionProps) {
  const { isPending, run } = useServerAction()
  const message = result ? RESULT_MESSAGES[result] : undefined

  return (
    <div className="flex flex-col gap-4">
      {message ? (
        <Alert variant={message.error ? "destructive" : "default"} role={message.error ? "alert" : "status"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      ) : null}
      {!available ? (
        <p className="text-sm text-muted-foreground">GitHub account linking has not been set up by your administrator.</p>
      ) : username ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">
            Connected as <span className="font-mono font-medium">@{username}</span>
          </p>
          <ConfirmDialog
            trigger={
              <Button variant="outline" disabled={isPending}>
                Disconnect
              </Button>
            }
            title="Disconnect GitHub?"
            description="Your access to project repositories that was granted through this workspace will be removed."
            confirmLabel="Disconnect"
            destructive
            onConfirm={() => run(() => disconnectGithub({}), "GitHub disconnected")}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Connect your GitHub account to get access to your projects&apos; repositories automatically.</p>
          <Button nativeButton={false} render={<a href="/api/auth/github" />}>
            <GitBranchIcon aria-hidden />
            Connect GitHub
          </Button>
        </div>
      )}
    </div>
  )
}
