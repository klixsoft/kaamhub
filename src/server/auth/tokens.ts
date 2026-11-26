import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"
import { env } from "@/config/env"

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  return left.length === right.length && timingSafeEqual(left, right)
}

export type InternalTokenPurpose = "updater" | "cron"

/*
 * Tokens for the updater and the scheduled job are derived from SESSION_SECRET,
 * so a self-hosted install needs no extra secrets. The updater container derives
 * the same values from the same secret.
 */
export function internalToken(purpose: InternalTokenPurpose): string {
  return createHmac("sha256", env.SESSION_SECRET).update(`kaamhub:${purpose}`).digest("hex")
}
