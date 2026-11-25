import { z } from "zod"
import { GITHUB_PERMISSIONS, type GithubPermission } from "@/config/domain"
import { CALENDARS, NUMBERING_SYSTEMS } from "@/config/finance"
import { DEFAULT_MODULES, type ModuleState } from "@/config/modules"
import type { ProjectRole } from "@/config/roles"

export const LOOKUP_KINDS = ["departments", "designations", "projectCategories", "projectStages", "serviceCategories"] as const
export type LookupKind = (typeof LOOKUP_KINDS)[number]

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
  manager: githubPermission.default("maintain"),
  member: githubPermission.default("push"),
  viewer: githubPermission.default("pull"),
}) satisfies z.ZodType<Record<ProjectRole, GithubPermission>>

export const githubSettingsSchema = z.object({
  projectRolePermissions: projectRolePermissionsSchema,
  removeAccessOnUnassign: z.boolean(),
})

export type GithubSettings = z.infer<typeof githubSettingsSchema>

const optionalText = (max: number) => z.string().trim().max(max).default("")

export const billingSettingsSchema = z.object({
  legalName: z.string().trim().min(2, "Enter the registered company name").max(160),
  taxIdLabel: z.string().trim().min(2, "Enter the label for tax numbers, e.g. Tax ID").max(30),
  taxNumber: optionalText(40),
  invoiceTitle: z.string().trim().min(2, "Enter the document title").max(40),
  address: optionalText(300),
  phone: optionalText(60),
  email: z.email("Enter a valid email address").or(z.literal("")),
  website: optionalText(200),
  invoicePrefix: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9/-]{0,10}$/, "Use up to 10 letters, numbers, dashes or slashes"),
  calendar: z.enum(CALENDARS),
  fiscalYearStartMonth: z.coerce.number().int().min(1).max(12),
  showAmountInWords: z.boolean(),
  paymentTermsDays: z.coerce.number().int().min(0).max(180),
  bankDetails: optionalText(1000),
  invoiceFooter: optionalText(500),
  recurringLeadDays: z.coerce.number().int().min(0).max(60),
  currencyCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Use the 3-letter currency code, e.g. USD"),
  currencySymbol: z.string().trim().min(1, "Enter a symbol").max(6),
  currencyMajorName: z.string().trim().min(2, "Enter the currency name, e.g. Dollars").max(30),
  currencyMinorName: z.string().trim().max(30).default(""),
  currencyNumbering: z.enum(NUMBERING_SYSTEMS),
})

export type BillingSettings = z.infer<typeof billingSettingsSchema>

export const billingSettingsFormSchema = billingSettingsSchema.extend({
  showAmountInWords: z.stringbool(),
})

export const moduleSettingsSchema = z.object({
  clients: z.boolean(),
  invoices: z.boolean(),
  services: z.boolean(),
  environments: z.boolean().default(true),
  github: z.boolean(),
}) satisfies z.ZodType<ModuleState>

export const moduleSettingsFormSchema = z.object({
  clients: z.stringbool(),
  invoices: z.stringbool(),
  services: z.stringbool(),
  environments: z.stringbool(),
  github: z.stringbool(),
})

export const SETTINGS_DEFAULTS = {
  modules: DEFAULT_MODULES,
  general: { companyName: "KaamHub", projectCodePrefix: "" } satisfies GeneralSettings,
  billing: {
    legalName: "",
    taxNumber: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    invoicePrefix: "INV-",
    paymentTermsDays: 15,
    bankDetails: "",
    invoiceFooter: "",
    recurringLeadDays: 7,
    taxIdLabel: "Tax ID",
    invoiceTitle: "Invoice",
    calendar: "gregorian",
    fiscalYearStartMonth: 1,
    showAmountInWords: false,
    currencyCode: "USD",
    currencySymbol: "$",
    currencyMajorName: "Dollars",
    currencyMinorName: "Cents",
    currencyNumbering: "international",
  } satisfies BillingSettings,
  github: {
    projectRolePermissions: { manager: "maintain", member: "push", viewer: "pull" },
    removeAccessOnUnassign: true,
  } satisfies GithubSettings,
}

export const SETTINGS_SCHEMAS = {
  modules: moduleSettingsSchema,
  general: generalSettingsSchema,
  billing: billingSettingsSchema,
  github: githubSettingsSchema,
}

export type SettingsKey = keyof typeof SETTINGS_SCHEMAS
export type SettingsValue<TKey extends SettingsKey> = z.infer<(typeof SETTINGS_SCHEMAS)[TKey]>
