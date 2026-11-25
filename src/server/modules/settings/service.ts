import "server-only"
import { updateTag } from "next/cache"
import { db } from "@/server/db"
import { appSettings } from "@/server/db/schema"
import { settingsTag } from "./queries"
import type { SettingsKey, SettingsValue } from "./schema"

export async function saveSettings<TKey extends SettingsKey>(key: TKey, value: SettingsValue<TKey>): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
  updateTag(settingsTag(key))
}
