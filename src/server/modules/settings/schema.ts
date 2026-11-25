import { z } from "zod"
import { GITHUB_PERMISSIONS, type GithubPermission } from "@/config/domain"
import { DEFAULT_CURRENCY, NUMBERING_SYSTEMS, TAX_REGISTRATIONS } from "@/config/finance"
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

const optionalText = (max: number) => z.string().trim().max(max).default("")

export const billingSettingsSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered company name").max(160),
  taxRegistration: z.enum(TAX_REGISTRATIONS),
  taxNumber: z
    .string()
    .trim()
    .regex(/^\d{9}$/, "PAN/VAT numbers in Nepal have 9 digits")
    .or(z.literal("")),
  address: optionalText(300),
  phone: optionalText(60),
  email: z.email("Enter a valid email address").or(z.literal("")),
  website: optionalText(200),
  paymentTermsDays: z.coerce.number().int().min(0).max(180),
  bankDetails: optionalText(1000),
  invoiceFooter: optionalText(500),
  recurringLeadDays: z.coerce.number().int().min(0).max(60),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use the 3-letter currency code, e.g. NPR"),
  currencySymbol: z.string().trim().min(1, "Enter a symbol").max(6),
  currencyMajorName: z.string().trim().min(2, "Enter the currency name, e.g. Rupees").max(30),
  currencyMinorName: z.string().trim().max(30).default(""),
  currencyNumbering: z.enum(NUMBERING_SYSTEMS),
})

export type BillingSettings = z.infer<typeof billingSettingsSchema>

export const SETTINGS_DEFAULTS = {
  general: { companyName: "KaamHub", projectCodePrefix: "" } satisfies GeneralSettings,
  billing: {
    legalName: "",
    taxRegistration: "vat",
    taxNumber: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    paymentTermsDays: 15,
    bankDetails: "",
    invoiceFooter: "",
    recurringLeadDays: 7,
    currencyCode: DEFAULT_CURRENCY.code,
    currencySymbol: DEFAULT_CURRENCY.symbol,
    currencyMajorName: DEFAULT_CURRENCY.majorName,
    currencyMinorName: DEFAULT_CURRENCY.minorName,
    currencyNumbering: DEFAULT_CURRENCY.numbering,
  } satisfies BillingSettings,
  github: {
    projectRolePermissions: { manager: "maintain", developer: "push", designer: "pull", qa: "triage", viewer: "pull" },
    removeAccessOnUnassign: true,
  } satisfies GithubSettings,
}

export const SETTINGS_SCHEMAS = {
  general: generalSettingsSchema,
  billing: billingSettingsSchema,
  github: githubSettingsSchema,
}

export type SettingsKey = keyof typeof SETTINGS_SCHEMAS
export type SettingsValue<TKey extends SettingsKey> = z.infer<(typeof SETTINGS_SCHEMAS)[TKey]>
