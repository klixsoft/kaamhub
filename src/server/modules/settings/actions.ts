"use server"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"
import { z } from "zod"
import { db } from "@/server/db"
import { departments, designations, projectCategories, projectMembers, projectStages, serviceCategories } from "@/server/db/schema"
import { action, formAction } from "@/server/lib/action"
import { AppError } from "@/server/lib/errors"
import { reconcileGithubAccess } from "@/server/modules/github/access-sync"
import { syncRepositories } from "@/server/modules/github/repositories"
import { recordAudit } from "@/server/services/audit"
import { LOOKUP_KINDS } from "./schema"
import { billingSettingsFormSchema, generalSettingsSchema, moduleSettingsFormSchema, projectRolePermissionsSchema } from "./schema"
import { saveSettings } from "./service"

export const saveGeneralSettings = formAction({
  schema: generalSettingsSchema,
  permission: "settings:manage",
  handler: async (input, { user }) => {
    await saveSettings("general", input)
    await recordAudit({ actorId: user.id, action: "settings.general_updated", entityType: "settings", entityId: "general" })
    revalidatePath("/", "layout")
    return undefined
  },
})

export const saveModuleSettings = formAction({
  schema: moduleSettingsFormSchema,
  permission: "settings:manage",
  handler: async (input, { user }) => {
    await saveSettings("modules", input)
    await recordAudit({ actorId: user.id, action: "settings.modules_updated", entityType: "settings", entityId: "modules", metadata: input })
    revalidatePath("/", "layout")
    return undefined
  },
})

export const saveBillingSettings = formAction({
  schema: billingSettingsFormSchema,
  permission: "settings:manage",
  module: "invoices",
  handler: async (input, { user }) => {
    await saveSettings("billing", input)
    await recordAudit({ actorId: user.id, action: "settings.billing_updated", entityType: "settings", entityId: "billing" })
    revalidatePath("/settings/billing")
    revalidatePath("/invoices", "layout")
    return undefined
  },
})

const lookupTables = { departments, designations, projectCategories, projectStages, serviceCategories } as const
const lookupSchema = z.object({ kind: z.enum(LOOKUP_KINDS), name: z.string().trim().min(2, "Enter a name").max(80) })

export const addLookup = formAction({
  schema: lookupSchema,
  permission: "settings:manage",
  handler: async ({ kind, name }) => {
    const table = lookupTables[kind]
    const [created] = await db.insert(table).values({ name }).onConflictDoNothing().returning({ id: table.id })
    if (!created) throw new AppError(`"${name}" already exists.`, "CONFLICT")
    revalidatePath("/settings/general")
    return created
  },
})

export const removeLookup = action({
  schema: z.object({ kind: z.enum(LOOKUP_KINDS), id: z.uuid() }),
  permission: "settings:manage",
  handler: async ({ kind, id }) => {
    const table = lookupTables[kind]
    await db.delete(table).where(eq(table.id, id))
    revalidatePath("/settings/general")
    return undefined
  },
})

const githubFormSchema = projectRolePermissionsSchema.extend({ removeAccessOnUnassign: z.stringbool() })

export const saveGithubSettings = formAction({
  schema: githubFormSchema,
  permission: "github:manage",
  module: "github",
  handler: async ({ removeAccessOnUnassign, ...permissions }, { user }) => {
    await saveSettings("github", { projectRolePermissions: permissions, removeAccessOnUnassign })
    await recordAudit({ actorId: user.id, action: "settings.github_updated", entityType: "settings", entityId: "github" })
    after(async () => {
      const members = await db.selectDistinct({ id: projectMembers.userId }).from(projectMembers)
      await reconcileGithubAccess({ userIds: members.map((member) => member.id) })
    })
    revalidatePath("/settings/github")
    return undefined
  },
})

export const syncGithubRepositories = action({
  schema: z.object({}),
  permission: "github:manage",
  handler: async (_input, { user }) => {
    const result = await syncRepositories()
    await recordAudit({ actorId: user.id, action: "github.repositories_synced", entityType: "github", metadata: result })
    revalidatePath("/settings/github")
    return result
  },
})

export const removeLogo = action({
  schema: z.object({}),
  permission: "settings:manage",
  handler: async (_input, { user }) => {
    await saveSettings("branding", { logoKey: "" })
    await recordAudit({ actorId: user.id, action: "settings.logo_removed", entityType: "settings", entityId: "branding" })
    revalidatePath("/settings/general")
    return undefined
  },
})
