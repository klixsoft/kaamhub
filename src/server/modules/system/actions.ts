"use server"

import { updateTag } from "next/cache"
import { z } from "zod"
import { action } from "@/server/lib/action"
import { AppError } from "@/server/lib/errors"
import { recordAudit } from "@/server/services/audit"
import { getVersionStatus, RELEASE_CACHE_TAG } from "./releases"
import { requestUpdate } from "./updater"

export const checkForUpdates = action({
  schema: z.object({}),
  permission: "system:update",
  handler: async () => {
    updateTag(RELEASE_CACHE_TAG)
    return undefined
  },
})

export const startUpdate = action({
  schema: z.object({ version: z.string().min(1).max(64) }),
  permission: "system:update",
  handler: async ({ version }, { user }) => {
    const status = await getVersionStatus()
    if (!status.latest || !status.updateAvailable || status.latest.version !== version) {
      throw new AppError("This version is not the latest available release.")
    }
    await requestUpdate(status.latest.version)
    await recordAudit({ actorId: user.id, action: "system.update_started", entityType: "system", metadata: { from: status.current, to: version } })
    return undefined
  },
})
