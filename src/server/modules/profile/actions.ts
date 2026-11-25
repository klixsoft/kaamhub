"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { action } from "@/server/lib/action"
import { unlinkGithubAccount } from "@/server/modules/github/account-link"
import { recordAudit } from "@/server/services/audit"

export const disconnectGithub = action({
  schema: z.object({}),
  handler: async (_input, { user }) => {
    await unlinkGithubAccount(user.id)
    await recordAudit({ actorId: user.id, action: "profile.github_disconnected", entityType: "user", entityId: user.id })
    revalidatePath("/profile")
    return undefined
  },
})
