import "server-only"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { env } from "@/config/env"
import { AppError } from "./errors"

const ALGORITHM = "aes-256-gcm"
const VERSION = "v1"

const encryptionKey = /^[0-9a-f]{64}$/i.test(env.ENCRYPTION_KEY) ? Buffer.from(env.ENCRYPTION_KEY, "hex") : Buffer.from(env.ENCRYPTION_KEY, "base64")

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, encryptionKey, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":")
}

export function decryptSecret(payload: string): string {
  const [version, iv, tag, ciphertext] = payload.split(":")
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new AppError("The stored secret is not readable.", "UNAVAILABLE")
  const decipher = createDecipheriv(ALGORITHM, encryptionKey, Buffer.from(iv, "base64"))
  decipher.setAuthTag(Buffer.from(tag, "base64"))
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8")
}
