import "server-only"
import { z } from "zod"
import { UPDATER_URL } from "@/config/app"
import { internalToken } from "@/server/auth/tokens"
import { AppError } from "@/server/lib/errors"

export const updaterStatusSchema = z.object({
  state: z.enum(["idle", "running", "succeeded", "failed"]),
  version: z.string().nullable(),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  log: z.array(z.string()),
})

export type UpdaterStatus = z.infer<typeof updaterStatusSchema>

function callUpdater(path: string, init: RequestInit = {}, timeoutMs = 10_000): Promise<Response> {
  return fetch(new URL(path, UPDATER_URL), {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Authorization: `Bearer ${internalToken("updater")}`, "Content-Type": "application/json", ...init.headers },
  })
}

/*
 * The updater runs as its own container in the provided Docker Compose stack.
 * When it cannot be reached (for example in development or a custom setup),
 * the System page falls back to manual update instructions.
 */
export async function getUpdaterStatus(): Promise<UpdaterStatus | null> {
  const response = await callUpdater("/status", {}, 3_000).catch(() => null)
  if (!response) return null
  if (!response.ok) throw new Error(`Updater status failed with ${response.status}`)
  return updaterStatusSchema.parse(await response.json())
}

export async function requestUpdate(version: string): Promise<void> {
  const response = await callUpdater("/update", { method: "POST", body: JSON.stringify({ version }) }).catch(() => {
    throw new AppError("The updater service is not reachable. Update manually as described in docs/deployment.md.", "UNAVAILABLE")
  })
  if (response.status === 409) throw new AppError("An update is already running.", "CONFLICT")
  if (!response.ok) throw new AppError("The updater rejected the request. Check the updater logs.", "UNAVAILABLE")
}
