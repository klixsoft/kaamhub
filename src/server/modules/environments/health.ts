import "server-only"
import { lookup } from "node:dns/promises"
import { isIP } from "node:net"
import { eq, isNotNull } from "drizzle-orm"
import { db } from "@/server/db"
import { projectEnvironments } from "@/server/db/schema"
import { mapWithConcurrency } from "@/server/lib/concurrency"
import { logger } from "@/server/lib/logger"

const TIMEOUT_MS = 10_000
const CHECK_CONCURRENCY = 5

const PRIVATE_V4 = [
  [0x00000000, 8],
  [0x0a000000, 8],
  [0x64400000, 10],
  [0x7f000000, 8],
  [0xa9fe0000, 16],
  [0xac100000, 12],
  [0xc0a80000, 16],
  [0xc6120000, 15],
  [0xe0000000, 4],
] as const

function ipv4ToNumber(address: string): number {
  return address.split(".").reduce((total, part) => (total << 8) + Number(part), 0) >>> 0
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const value = ipv4ToNumber(address)
    return !PRIVATE_V4.some(([base, bits]) => value >>> (32 - bits) === base >>> (32 - bits))
  }
  const normalized = address.toLowerCase()
  if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7))
  return !(normalized === "::1" || normalized === "::" || /^(fc|fd|fe8|fe9|fea|feb)/.test(normalized))
}

async function assertPublicHost(url: URL): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, "")
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true })
  if (addresses.length === 0 || !addresses.every((entry) => isPublicAddress(entry.address))) {
    throw new Error("The URL does not resolve to a public address")
  }
}

export interface HealthResult {
  health: "up" | "down"
  lastStatusCode: number | null
  lastResponseMs: number | null
}

export async function probeUrl(rawUrl: string): Promise<HealthResult> {
  const started = performance.now()
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Unsupported protocol")
    await assertPublicHost(url)
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "KaamHub uptime check" },
    })
    await response.body?.cancel()
    return {
      health: response.status < 500 ? "up" : "down",
      lastStatusCode: response.status,
      lastResponseMs: Math.round(performance.now() - started),
    }
  } catch (error) {
    logger.debug("Environment check failed", { url: rawUrl, error })
    return { health: "down", lastStatusCode: null, lastResponseMs: null }
  }
}

export async function checkEnvironment(environmentId: string, url: string): Promise<HealthResult> {
  const result = await probeUrl(url)
  await db
    .update(projectEnvironments)
    .set({ ...result, lastCheckedAt: new Date() })
    .where(eq(projectEnvironments.id, environmentId))
  return result
}

export async function checkAllEnvironments(): Promise<{ checked: number; down: number }> {
  const targets = await db
    .select({ id: projectEnvironments.id, url: projectEnvironments.url })
    .from(projectEnvironments)
    .where(isNotNull(projectEnvironments.url))
  const results = await mapWithConcurrency(targets, CHECK_CONCURRENCY, (target) => checkEnvironment(target.id, target.url as string))
  return { checked: results.length, down: results.filter((result) => result.health === "down").length }
}
