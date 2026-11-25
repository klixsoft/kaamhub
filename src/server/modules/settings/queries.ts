import "server-only"
import { asc, eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"
import { db } from "@/server/db"
import { appSettings, departments, designations } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import type { CurrencyFormat } from "@/config/finance"
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
  const [departmentRows, designationRows] = await Promise.all([
    db.select({ id: departments.id, name: departments.name }).from(departments).orderBy(asc(departments.name)),
    db.select({ id: designations.id, name: designations.name }).from(designations).orderBy(asc(designations.name)),
  ])
  return { departments: departmentRows, designations: designationRows }
}

export async function getCurrencyFormat(): Promise<CurrencyFormat> {
  const billing = await getSettings("billing")
  return {
    code: billing.currencyCode,
    symbol: billing.currencySymbol,
    majorName: billing.currencyMajorName,
    minorName: billing.currencyMinorName,
    numbering: billing.currencyNumbering,
  }
}
