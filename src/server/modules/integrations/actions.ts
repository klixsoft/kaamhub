"use server"

import { revalidatePath } from "next/cache"
import { encryptSecret } from "@/server/lib/crypto"
import { action, formAction } from "@/server/lib/action"
import { AppError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { getSettings } from "@/server/modules/settings/queries"
import { saveSettings } from "@/server/modules/settings/service"
import { recordAudit } from "@/server/services/audit"
import { sendMail, verifyEmailConfig } from "@/server/services/mailer"
import { getEmailConfig } from "./config"
import { emailFormSchema, githubAppFormSchema, testEmailSchema } from "./schema"

function keepOrEncrypt(next: string, current: string): string {
  return next ? encryptSecret(next) : current
}

export const saveEmailSettings = formAction({
  schema: emailFormSchema,
  permission: "system:update",
  handler: async ({ password, ...input }, { user }) => {
    const current = await getSettings("email")
    await saveSettings("email", { ...input, passwordEncrypted: input.host ? keepOrEncrypt(password, current.passwordEncrypted) : "" })
    await recordAudit({ actorId: user.id, action: "settings.email_updated", entityType: "settings", entityId: "email", metadata: { host: input.host } })
    revalidatePath("/settings/system")
    return undefined
  },
})

export const sendTestEmail = action({
  schema: testEmailSchema,
  permission: "system:update",
  handler: async ({ to }) => {
    const config = await getEmailConfig()
    if (!config) throw new AppError("Save the email settings first.")
    try {
      await verifyEmailConfig(config)
      await sendMail({ to, subject: "KaamHub test email", text: "Your email settings work. KaamHub can now send invitations, password resets, invoices and reminders." })
    } catch (error) {
      logger.warn("Test email failed", { error })
      const reason = error instanceof Error ? error.message.slice(0, 200) : "Unknown error"
      throw new AppError(`The mail server refused the message: ${reason}`)
    }
    return undefined
  },
})

export const saveGithubAppSettings = formAction({
  schema: githubAppFormSchema,
  permission: "system:update",
  handler: async ({ privateKey, webhookSecret, clientSecret, ...input }, { user }) => {
    const current = await getSettings("githubApp")
    if (privateKey && !/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(privateKey)) {
      throw new AppError("Paste the whole private key, including the BEGIN and END lines.")
    }
    await saveSettings("githubApp", {
      ...input,
      privateKeyEncrypted: keepOrEncrypt(privateKey.replace(/\\n/g, "\n"), current.privateKeyEncrypted),
      webhookSecretEncrypted: keepOrEncrypt(webhookSecret, current.webhookSecretEncrypted),
      clientSecretEncrypted: keepOrEncrypt(clientSecret, current.clientSecretEncrypted),
    })
    await recordAudit({ actorId: user.id, action: "settings.github_app_updated", entityType: "settings", entityId: "githubApp", metadata: { appId: input.appId, organization: input.organization } })
    revalidatePath("/settings/github")
    return undefined
  },
})
