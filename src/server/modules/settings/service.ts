import "server-only"
import { revalidateTag, updateTag } from "next/cache"
import { db } from "@/server/db"
import { appSettings } from "@/server/db/schema"
import { settingsTag } from "./queries"
import type { SettingsKey, SettingsValue } from "./schema"

/*
 * updateTag only works inside Server Actions; Route Handlers (such as file
 * uploads) expire the cached settings immediately with revalidateTag instead.
 */
export async function saveSettings<TKey extends SettingsKey>(key: TKey, value: SettingsValue<TKey>, options: { from?: "action" | "route" } = {}): Promise<void> {
  await db
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedAt: new Date() } })
  if (options.from === "route") revalidateTag(settingsTag(key), { expire: 0 })
  else updateTag(settingsTag(key))
}
