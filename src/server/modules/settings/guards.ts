import "server-only"
import { notFound } from "next/navigation"
import type { ModuleKey } from "@/config/modules"
import { isModuleEnabled } from "./queries"

export async function requireModule(key: ModuleKey): Promise<void> {
  if (!(await isModuleEnabled(key))) notFound()
}
