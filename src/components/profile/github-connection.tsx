"use client"

import { GitBranchIcon } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { authClient } from "@/lib/auth-client"
import { disconnectGithub } from "@/server/modules/profile/actions"

export function GithubConnection({ username, available }: { username: string | null; available: boolean }) {
  const { isPending, run } = useServerAction()
  const [redirecting, setRedirecting] = useState(false)

  async function connect() {
    setRedirecting(true)
    const { error } = await authClient.linkSocial({ provider: "github", callbackURL: "/profile" })
    if (error) {
      setRedirecting(false)
      toast.error("Could not start GitHub sign-in. Please try again.")
    }
  }

  if (!available) return <p className="text-sm text-muted-foreground">GitHub account linking has not been set up by your administrator.</p>

  if (!username) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Connect your GitHub account to get access to your projects&apos; repositories automatically.</p>
        <Button onClick={connect} disabled={redirecting}>
          <GitBranchIcon aria-hidden />
          {redirecting ? "Redirecting…" : "Connect GitHub"}
        </Button>
      </div>
    )
  }

  return (
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
  )
}
