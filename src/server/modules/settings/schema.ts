import { z } from "zod"
import { GITHUB_PERMISSIONS, type GithubPermission } from "@/config/domain"
import type { ProjectRole } from "@/config/roles"

export const generalSettingsSchema = z.object({
  companyName: z.string().trim().min(2, "Enter the company name").max(80),
  projectCodePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{0,6}$/, "Use up to 6 letters"),
})

export type GeneralSettings = z.infer<typeof generalSettingsSchema>

const githubPermission = z.enum(GITHUB_PERMISSIONS)

export const projectRolePermissionsSchema = z.object({
  manager: githubPermission,
  developer: githubPermission,
  designer: githubPermission,
  qa: githubPermission,
  viewer: githubPermission,
}) satisfies z.ZodType<Record<ProjectRole, GithubPermission>>

export const githubSettingsSchema = z.object({
  projectRolePermissions: projectRolePermissionsSchema,
  removeAccessOnUnassign: z.boolean(),
})

export type GithubSettings = z.infer<typeof githubSettingsSchema>

export const SETTINGS_DEFAULTS = {
  general: { companyName: "KaamHub", projectCodePrefix: "" } satisfies GeneralSettings,
  github: {
    projectRolePermissions: { manager: "maintain", developer: "push", designer: "pull", qa: "triage", viewer: "pull" },
    removeAccessOnUnassign: true,
  } satisfies GithubSettings,
}

export const SETTINGS_SCHEMAS = {
  general: generalSettingsSchema,
  github: githubSettingsSchema,
}

export type SettingsKey = keyof typeof SETTINGS_SCHEMAS
export type SettingsValue<TKey extends SettingsKey> = z.infer<(typeof SETTINGS_SCHEMAS)[TKey]>
