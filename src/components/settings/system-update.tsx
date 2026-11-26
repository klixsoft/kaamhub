"use client"

import { CheckCircle2Icon, DownloadIcon, ExternalLinkIcon, Loader2Icon, RefreshCwIcon } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDateTime } from "@/lib/format"
import { checkForUpdates, startUpdate } from "@/server/modules/system/actions"
import type { VersionStatus } from "@/server/modules/system/releases"
import type { UpdaterStatus } from "@/server/modules/system/updater"

const POLL_INTERVAL_MS = 3000

interface SystemUpdateProps {
  version: VersionStatus
  updaterConfigured: boolean
  initialStatus: UpdaterStatus | null
}

export function SystemUpdate({ version, updaterConfigured, initialStatus }: SystemUpdateProps) {
  const { isPending, run } = useServerAction()
  const [status, setStatus] = useState(initialStatus)
  const [polling, setPolling] = useState(initialStatus?.state === "running")
  const [restarted, setRestarted] = useState(false)

  const poll = useCallback(async () => {
    try {
      const response = await fetch("/api/system/update-status", { cache: "no-store" })
      const body = (await response.json()) as { status: UpdaterStatus | null }
      if (body.status) setStatus(body.status)
      if (body.status && body.status.state !== "running") {
        setPolling(false)
        if (body.status.state === "succeeded") setRestarted(true)
      }
    } catch {
      return
    }
  }, [])

  useEffect(() => {
    if (!polling) return
    const timer = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [polling, poll])

  useEffect(() => {
    if (!restarted || !status?.version) return
    const target = status.version
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/health", { cache: "no-store" })
        const body = (await response.json()) as { version: string }
        if (body.version.replace(/^v/, "") === target) window.location.reload()
      } catch {
        return
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [restarted, status?.version])

  const latest = version.latest

  return (
    <div className="flex flex-col gap-6">
      <dl className="grid gap-4 sm:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Installed version</dt>
          <dd className="font-mono text-lg">{version.current}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Latest release</dt>
          <dd className="font-mono text-lg">{latest?.version ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Release source</dt>
          <dd className="truncate font-mono text-sm">{version.repository}</dd>
        </div>
      </dl>

      {version.checkFailed ? (
        <Alert variant="destructive">
          <AlertTitle>Could not reach GitHub</AlertTitle>
          <AlertDescription>Please try again in a moment.</AlertDescription>
        </Alert>
      ) : null}

      {latest && version.updateAvailable ? (
        <Alert>
          <DownloadIcon aria-hidden />
          <AlertTitle>
            {latest.name} is available <Badge variant="secondary">{formatDateTime(latest.publishedAt)}</Badge>
          </AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            {latest.notes ? <pre className="max-h-48 overflow-auto font-sans text-sm whitespace-pre-wrap">{latest.notes}</pre> : null}
            <a href={latest.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
              Full release notes <ExternalLinkIcon className="size-3" aria-hidden />
            </a>
          </AlertDescription>
        </Alert>
      ) : latest && !version.checkFailed ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />
          You are running the latest version.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={isPending} onClick={() => run(() => checkForUpdates({}), "Checked for updates")}>
          <RefreshCwIcon aria-hidden />
          Check now
        </Button>
        {latest && version.updateAvailable ? (
          <ConfirmDialog
            trigger={
              <Button disabled={!updaterConfigured || isPending || polling}>
                <DownloadIcon aria-hidden />
                Update to {latest.version}
              </Button>
            }
            title={`Update to ${latest.version}?`}
            description="The new image is pulled and the app restarts. Database migrations run automatically on start. Users may see a short interruption."
            confirmLabel="Update now"
            onConfirm={() =>
              run(() => startUpdate({ version: latest.version }), "Update started", () => {
                setStatus({ state: "running", version: latest.version, startedAt: new Date().toISOString(), finishedAt: null, log: [] })
                setPolling(true)
              })
            }
          />
        ) : null}
      </div>

      {!updaterConfigured ? (
        <p className="text-sm text-muted-foreground">
          The updater service is not running, so one-click updates are unavailable. It is part of the provided Docker Compose stack; without it, update manually as described in docs/deployment.md.
        </p>
      ) : null}

      {status && status.state !== "idle" ? (
        <section aria-live="polite" className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {status.state === "running" ? <Loader2Icon className="size-4 animate-spin" aria-hidden /> : null}
            {status.state === "running"
              ? `Updating to ${status.version}…`
              : status.state === "succeeded"
                ? restarted
                  ? "Update applied. Waiting for the app to restart…"
                  : "Update finished"
                : "Update failed"}
          </h2>
          {status.log.length > 0 ? (
            <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">{status.log.join("\n")}</pre>
          ) : null}
        </section>
      ) : null}
    </div>
  )
}
