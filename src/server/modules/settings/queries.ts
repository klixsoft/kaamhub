import "server-only"
import { asc, eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"
import { db } from "@/server/db"
import { appSettings, departments, designations, projectCategories, projectStages, serviceCategories } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import type { CurrencyFormat, InvoiceFormat } from "@/config/finance"
import type { BillingSettings } from "./schema"
import { type ModuleKey, type ModuleState, effectiveModules } from "@/config/modules"
import { SETTINGS_DEFAULTS, SETTINGS_SCHEMAS, type SettingsKey, type SettingsValue } from "./schema"

export const settingsTag = (key: SettingsKey) => `settings:${key}`

export async function getSettings<TKey extends SettingsKey>(key: TKey): Promise<SettingsValue<TKey>> {
  "use cache"
  cacheTag(settingsTag(key))
  cacheLife("hours")

  const [row] = await db.select({ value: appSettings.value }).from(appSettings).where(eq(appSettings.key, key)).limit(1)
  if (!row) return SETTINGS_DEFAULTS[key] as SettingsValue<TKey>

  const parsed = SETTINGS_SCHEMAS[key].safeParse({ ...SETTINGS_DEFAULTS[key], ...(row.value as object) })
  if (!parsed.success) {
    logger.warn("Stored settings are invalid; using defaults", { key })
    return SETTINGS_DEFAULTS[key] as SettingsValue<TKey>
  }
  return parsed.data as SettingsValue<TKey>
}

export async function getCompanyName(): Promise<string> {
  return (await getSettings("general")).companyName
}

export async function listLookups() {
  const list = (table: typeof departments | typeof designations | typeof projectCategories | typeof projectStages | typeof serviceCategories) =>
    db.select({ id: table.id, name: table.name }).from(table).orderBy(asc(table.name))
  const [departmentRows, designationRows, projectCategoryRows, projectStageRows, serviceCategoryRows] = await Promise.all([
    list(departments),
    list(designations),
    list(projectCategories),
    list(projectStages),
    list(serviceCategories),
  ])
  return {
    departments: departmentRows,
    designations: designationRows,
    projectCategories: projectCategoryRows,
    projectStages: projectStageRows,
    serviceCategories: serviceCategoryRows,
  }
}

export function currencyFormatOf(billing: BillingSettings): CurrencyFormat {
  return {
    code: billing.currencyCode,
    symbol: billing.currencySymbol,
    majorName: billing.currencyMajorName,
    minorName: billing.currencyMinorName,
    numbering: billing.currencyNumbering,
  }
}

export function invoiceFormatOf(billing: BillingSettings): InvoiceFormat {
  return {
    taxIdLabel: billing.taxIdLabel,
    title: billing.invoiceTitle,
    calendar: billing.calendar,
    showAmountInWords: billing.showAmountInWords,
  }
}


export async function getModules(): Promise<ModuleState> {
  return effectiveModules(await getSettings("modules"))
}

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  return (await getModules())[key]
}
