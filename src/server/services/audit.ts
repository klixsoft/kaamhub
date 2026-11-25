import "server-only"
import { headers } from "next/headers"
import { db } from "@/server/db"
import { auditLogs } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"

interface AuditEntry {
  actorId: string | null
  action: string
  entityType: string
  entityId?: string | null
  metadata?: Record<string, unknown>
}

async function clientIp(): Promise<string | null> {
  try {
    const requestHeaders = await headers()
    return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? requestHeaders.get("x-real-ip")
  } catch {
    return null
  }
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.insert(auditLogs).values({ ...entry, entityId: entry.entityId ?? null, ipAddress: await clientIp() })
  } catch (error) {
    logger.error("Failed to write audit log", { error, action: entry.action })
  }
}
