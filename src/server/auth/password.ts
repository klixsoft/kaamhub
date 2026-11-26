import "server-only"
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto"

/*
 * Same scrypt parameters and "salt:key" hex format as earlier releases, so
 * passwords saved before the switch to built-in sessions keep working.
 */
const SCRYPT = { N: 16384, r: 16, p: 1, maxmem: 128 * 16384 * 16 * 2 }
const KEY_LENGTH = 64
const UNUSED_HASH = `${"0".repeat(32)}:${"0".repeat(128)}`

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, SCRYPT, (error, key) => (error ? reject(error) : resolve(key)))
  })
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex")
  return `${salt}:${(await deriveKey(password, salt)).toString("hex")}`
}

export async function verifyPassword(storedHash: string | null, password: string): Promise<boolean> {
  const [salt, key] = (storedHash ?? UNUSED_HASH).split(":")
  if (!salt || !key) return false
  const expected = Buffer.from(key, "hex")
  const actual = await deriveKey(password, salt)
  return storedHash !== null && expected.length === actual.length && timingSafeEqual(expected, actual)
}
