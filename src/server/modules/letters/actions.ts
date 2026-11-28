"use server"

import { and, eq, isNull, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { STARTER_LETTER_TEMPLATES } from "@/config/letter-templates"
import { formatDate } from "@/lib/format"
import { fillPlaceholders, placeholdersIn } from "@/lib/letter-placeholders"
import { db } from "@/server/db"
import { letters, letterTemplates, users } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError, notFoundError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { getSettings } from "@/server/modules/settings/queries"
import { saveSettings } from "@/server/modules/settings/service"
import { recordAudit } from "@/server/services/audit"
import { sendLetterEmail } from "./delivery"
import { allocateLetterNumber } from "./numbering"
import { getLetter } from "./queries"
import { issueLetterSchema, letterIdSchema, letterSettingsFormSchema, revokeLetterSchema, templateIdSchema, templateSchema, templateUpdateSchema } from "./schema"
import { companyValues, currentLayout, recipientValues } from "./values"

function revalidateLetters(recipientId?: string) {
  revalidatePath("/letters", "layout")
  revalidatePath("/profile")
  if (recipientId) revalidatePath(`/people/${recipientId}`)
}

async function assertUniqueName(name: string, exceptId?: string) {
  const [existing] = await db
    .select({ id: letterTemplates.id })
    .from(letterTemplates)
    .where(and(eq(letterTemplates.name, name), exceptId ? ne(letterTemplates.id, exceptId) : undefined))
    .limit(1)
  if (existing) throw new AppError(`A template called "${name}" already exists.`, "CONFLICT")
}

export const createTemplate = formAction({
  schema: templateSchema,
  permission: "letters:manage",
  handler: async (input, { user }) => {
    await assertUniqueName(input.name)
    const [created] = await db.insert(letterTemplates).values(input).returning({ id: letterTemplates.id })
    await recordAudit({ actorId: user.id, action: "letter_template.created", entityType: "letter_template", entityId: created?.id, metadata: { name: input.name } })
    revalidateLetters()
    return created
  },
})

export const updateTemplate = formAction({
  schema: templateUpdateSchema,
  permission: "letters:manage",
  handler: async ({ templateId, ...input }, { user }) => {
    await assertUniqueName(input.name, templateId)
    const updated = await db.update(letterTemplates).set(input).where(eq(letterTemplates.id, templateId)).returning({ id: letterTemplates.id })
    if (updated.length === 0) throw notFoundError("Template")
    await recordAudit({ actorId: user.id, action: "letter_template.updated", entityType: "letter_template", entityId: templateId })
    revalidateLetters()
    return { id: templateId }
  },
})

export const setTemplateArchived = action({
  schema: templateIdSchema.extend({ archived: z.boolean() }),
  permission: "letters:manage",
  handler: async ({ templateId, archived }, { user }) => {
    await db.update(letterTemplates).set({ archived }).where(eq(letterTemplates.id, templateId))
    await recordAudit({ actorId: user.id, action: archived ? "letter_template.archived" : "letter_template.restored", entityType: "letter_template", entityId: templateId })
    revalidateLetters()
    return undefined
  },
})

export const addStarterTemplates = action({
  schema: z.object({}),
  permission: "letters:manage",
  handler: async (_input, { user }) => {
    const created = await db
      .insert(letterTemplates)
      .values(STARTER_LETTER_TEMPLATES.map((template) => ({ ...template })))
      .onConflictDoNothing({ target: letterTemplates.name })
      .returning({ id: letterTemplates.id })
    await recordAudit({ actorId: user.id, action: "letter_template.starters_added", entityType: "letter_template", metadata: { count: created.length } })
    revalidateLetters()
    return { count: created.length }
  },
})

export const saveLetterSettings = formAction({
  schema: letterSettingsFormSchema,
  permission: "letters:manage",
  handler: async (input, { user }) => {
    const current = await getSettings("letters")
    await saveSettings("letters", { ...current, ...input })
    await recordAudit({ actorId: user.id, action: "settings.letters_updated", entityType: "settings", entityId: "letters" })
    revalidateLetters()
    return undefined
  },
})

export const removeLetterhead = action({
  schema: z.object({}),
  permission: "letters:manage",
  handler: async (_input, { user }) => {
    const current = await getSettings("letters")
    await saveSettings("letters", { ...current, letterheadKey: "" })
    await recordAudit({ actorId: user.id, action: "settings.letterhead_removed", entityType: "settings", entityId: "letters" })
    revalidateLetters()
    return undefined
  },
})

export const issueLetter = action({
  schema: issueLetterSchema,
  permission: "letters:manage",
  handler: async (input, { user }) => {
    const [recipient] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.recipientId)).limit(1)
    if (!recipient || recipient.role === "client") throw notFoundError("Person")

    const [settings, layout] = await Promise.all([getSettings("letters"), currentLayout()])
    const letter = await db.transaction(async (tx) => {
      const number = await allocateLetterNumber(tx, input.letterDate, settings.numberPrefix)
      const issueValues = { "letter.number": number, "letter.date": formatDate(input.letterDate) }
      const title = fillPlaceholders(input.title, issueValues)
      const body = fillPlaceholders(input.body, issueValues)
      const missing = placeholdersIn(`${title}\n${body}`)
      if (missing.length > 0) throw new AppError(`Fill in or remove these placeholders first: ${missing.map((key) => `{{${key}}}`).join(", ")}`)

      const [created] = await tx
        .insert(letters)
        .values({ number, templateId: input.templateId, recipientId: input.recipientId, title, body, letterDate: input.letterDate, layout, issuedById: user.id })
        .returning({ id: letters.id, number: letters.number })
      if (!created) throw new Error("Letter insert returned no row")
      return created
    })

    if (input.sendEmail) {
      after(async () => {
        try {
          await sendLetterEmail(letter.id)
        } catch (error) {
          logger.error("Failed to email letter", { error, letterId: letter.id })
        }
      })
    }
    await recordAudit({ actorId: user.id, action: "letter.issued", entityType: "user", entityId: input.recipientId, metadata: { letterId: letter.id, number: letter.number } })
    revalidateLetters(input.recipientId)
    return letter
  },
})

export const revokeLetter = action({
  schema: revokeLetterSchema,
  permission: "letters:manage",
  handler: async ({ letterId, reason }, { user }) => {
    const [revoked] = await db
      .update(letters)
      .set({ revokedAt: new Date(), revokedReason: reason })
      .where(and(eq(letters.id, letterId), isNull(letters.revokedAt)))
      .returning({ recipientId: letters.recipientId, number: letters.number })
    if (!revoked) throw new AppError("This letter was not found or is already revoked.")
    await recordAudit({ actorId: user.id, action: "letter.revoked", entityType: "user", entityId: revoked.recipientId, metadata: { letterId, number: revoked.number, reason } })
    revalidateLetters(revoked.recipientId)
    return undefined
  },
})

export const emailLetter = action({
  schema: letterIdSchema,
  permission: "letters:manage",
  handler: async ({ letterId }, { user }) => {
    const letter = await getLetter(letterId)
    if (!letter) throw notFoundError("Letter")
    if (letter.revokedAt) throw new AppError("Revoked letters cannot be sent.")
    await sendLetterEmail(letterId)
    await recordAudit({ actorId: user.id, action: "letter.emailed", entityType: "user", entityId: letter.recipientId, metadata: { letterId } })
    return undefined
  },
})

export const getLetterValues = action({
  schema: z.object({ recipientId: z.string().min(1) }),
  permission: "letters:manage",
  handler: async ({ recipientId }) => {
    const [recipient, company] = await Promise.all([recipientValues(recipientId), companyValues()])
    if (!recipient) throw notFoundError("Person")
    return Object.fromEntries(Object.entries({ ...company, ...recipient }).filter((entry): entry is [string, string] => Boolean(entry[1])))
  },
})
