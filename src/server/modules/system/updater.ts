import "server-only"
import { z } from "zod"
import { env } from "@/config/env"
import { AppError } from "@/server/lib/errors"

export const updaterStatusSchema = z.object({
  state: z.enum(["idle", "running", "succeeded", "failed"]),
  version: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  log: z.array(z.string()),
})

export type UpdaterStatus = z.infer<typeof updaterStatusSchema>

export function isUpdaterConfigured(): boolean {
  return Boolean(env.UPDATER_URL && env.UPDATER_TOKEN)
}

async function callUpdater(path: string, init: RequestInit = {}): Promise<Response> {
  if (!env.UPDATER_URL || !env.UPDATER_TOKEN) throw new AppError("The updater service is not configured.", "UNAVAILABLE")
  return fetch(new URL(path, env.UPDATER_URL), {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
    headers: { Authorization: `Bearer ${env.UPDATER_TOKEN}`, "Content-Type": "application/json", ...init.headers },
  })
}

export async function getUpdaterStatus(): Promise<UpdaterStatus | null> {
  if (!isUpdaterConfigured()) return null
  const response = await callUpdater("/status")
  if (!response.ok) throw new Error(`Updater status failed with ${response.status}`)
  return updaterStatusSchema.parse(await response.json())
}

export async function requestUpdate(version: string): Promise<void> {
  const response = await callUpdater("/update", { method: "POST", body: JSON.stringify({ version }) })
  if (response.status === 409) throw new AppError("An update is already running.", "CONFLICT")
  if (!response.ok) throw new AppError("The updater rejected the request. Check the updater logs.", "UNAVAILABLE")
}
