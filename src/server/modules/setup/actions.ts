"use server"

import { redirect } from "next/navigation"
import { z } from "zod"
import { createSession } from "@/server/auth/session-store"
import { db } from "@/server/db"
import { appSettings } from "@/server/db/schema"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { requestMeta, setSessionCookies } from "@/server/modules/auth/service"
import { createAccount } from "@/server/modules/people/accounts"
import { saveSettings } from "@/server/modules/settings/service"
import { SETTINGS_DEFAULTS } from "@/server/modules/settings/schema"
import { passwordSchema } from "@/server/modules/people/schema"
import type { ActionResult } from "@/types/action"
import { isSetupRequired } from "./queries"

const setupSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name").max(80),
  name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.email("Enter a valid email address").max(254),
  password: passwordSchema,
})

export async function completeSetup(_previous: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = setupSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { ok: false, error: "Please correct the highlighted fields.", fieldErrors: z.flattenError(parsed.error).fieldErrors }
  }

  try {
    if (!(await isSetupRequired())) throw new AppError("Setup has already been completed.", "CONFLICT")
    const [claimed] = await db
      .insert(appSettings)
      .values({ key: "setup", value: { completedAt: new Date().toISOString() } })
      .onConflictDoNothing()
      .returning({ key: appSettings.key })
    if (!claimed) throw new AppError("Setup has already been completed.", "CONFLICT")

    const account = await createAccount({ name: parsed.data.name, email: parsed.data.email, password: parsed.data.password, role: "super_admin" })
    await saveSettings("general", { ...SETTINGS_DEFAULTS.general, companyName: parsed.data.companyName })
    await setSessionCookies(await createSession(account.id, await requestMeta()))
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: error.message }
    logger.error("Initial setup failed", { error })
    return { ok: false, error: "Setup could not be completed. Please try again." }
  }

  redirect("/dashboard")
}
