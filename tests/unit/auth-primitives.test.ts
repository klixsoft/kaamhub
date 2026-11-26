import { sealData } from "iron-session"
import { describe, expect, it } from "vitest"
import { parseRefreshCookie, readAccess, refreshCookieValue, sealAccess } from "@/server/auth/cookies"
import { hashPassword, verifyPassword } from "@/server/auth/password"
import { hashToken, internalToken, randomToken, safeEqual } from "@/server/auth/tokens"
import { decryptSecret, encryptSecret } from "@/server/lib/crypto"

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const first = await hashPassword("Correct-Horse-2027")
    const second = await hashPassword("Correct-Horse-2027")
    expect(first).not.toBe(second)
    expect(await verifyPassword(first, "Correct-Horse-2027")).toBe(true)
    expect(await verifyPassword(first, "correct-horse-2027")).toBe(false)
  })

  it("rejects missing or malformed hashes", async () => {
    expect(await verifyPassword(null, "anything")).toBe(false)
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false)
  })

  it("accepts hashes created by earlier releases", async () => {
    const betterAuthHash = "875f91c3c9722d3b654243cb39dcb028:c1b5e174ccad35878b8546ebdfaf78604228dbf1be85a58a0d000923e601f3f4c0f7254a00b13f085dd8aad8783ab0e0f01f109e37dbd420cc0df570e12a8355"
    expect(await verifyPassword(betterAuthHash, "Sup3rSecretPass")).toBe(true)
    expect(await verifyPassword(betterAuthHash, "Sup3rSecretPass!")).toBe(false)
  })
})

describe("access cookie", () => {
  it("round-trips the session and user ids", async () => {
    const sealed = await sealAccess({ sid: "6f1c2b9e-2a4b-4a57-9b3e-0d5f4c1a2b3c", uid: "user-1" })
    expect(await readAccess(sealed)).toEqual({ sid: "6f1c2b9e-2a4b-4a57-9b3e-0d5f4c1a2b3c", uid: "user-1" })
  })

  it("rejects tampered, foreign and empty cookies", async () => {
    const sealed = await sealAccess({ sid: "6f1c2b9e-2a4b-4a57-9b3e-0d5f4c1a2b3c", uid: "user-1" })
    expect(await readAccess(`${sealed.slice(0, -4)}AAAA`)).toBeNull()
    expect(await readAccess(await sealData({ sid: "x", uid: "y" }, { password: "a-different-secret-that-is-long-enough-1234" }))).toBeNull()
    expect(await readAccess(undefined)).toBeNull()
  })
})

describe("refresh cookie", () => {
  it("parses only well-formed values", () => {
    const token = randomToken()
    expect(parseRefreshCookie(refreshCookieValue("6f1c2b9e-2a4b-4a57-9b3e-0d5f4c1a2b3c", token))).toEqual({ sessionId: "6f1c2b9e-2a4b-4a57-9b3e-0d5f4c1a2b3c", token })
    expect(parseRefreshCookie("not-a-uuid.token")).toBeNull()
    expect(parseRefreshCookie("6f1c2b9e-2a4b-4a57-9b3e-0d5f4c1a2b3c.short")).toBeNull()
    expect(parseRefreshCookie(undefined)).toBeNull()
  })
})

describe("tokens", () => {
  it("creates unguessable tokens and stable hashes", () => {
    expect(randomToken()).not.toBe(randomToken())
    expect(hashToken("abc")).toBe(hashToken("abc"))
    expect(hashToken("abc")).toHaveLength(64)
  })

  it("derives different internal tokens per purpose", () => {
    expect(internalToken("updater")).not.toBe(internalToken("cron"))
    expect(internalToken("updater")).toBe(internalToken("updater"))
  })

  it("compares strings safely", () => {
    expect(safeEqual("same", "same")).toBe(true)
    expect(safeEqual("same", "diff")).toBe(false)
    expect(safeEqual("short", "longer")).toBe(false)
  })
})

describe("secret encryption", () => {
  it("encrypts with a fresh IV and decrypts", () => {
    const first = encryptSecret("smtp-password")
    expect(first).not.toBe(encryptSecret("smtp-password"))
    expect(first.startsWith("v1:")).toBe(true)
    expect(decryptSecret(first)).toBe("smtp-password")
  })

  it("refuses tampered ciphertext", () => {
    const [version, iv, tag, data] = encryptSecret("smtp-password").split(":")
    const flipped = Buffer.from(data, "base64")
    flipped[0] ^= 1
    expect(() => decryptSecret([version, iv, tag, flipped.toString("base64")].join(":"))).toThrow()
  })
})
