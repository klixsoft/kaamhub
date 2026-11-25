import "server-only"
import { createReadStream } from "node:fs"
import { mkdir, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { Readable } from "node:stream"
import { env } from "@/config/env"

const root = path.resolve(env.STORAGE_DIR)

function resolveKey(key: string): string {
  const target = path.resolve(root, key)
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Invalid storage key")
  return target
}

export async function saveFile(key: string, data: Uint8Array): Promise<void> {
  const target = resolveKey(key)
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, data, { flag: "wx", mode: 0o600 })
}

export async function readFile(key: string): Promise<{ stream: ReadableStream<Uint8Array>; size: number } | null> {
  const target = resolveKey(key)
  try {
    const { size } = await stat(target)
    return { stream: Readable.toWeb(createReadStream(target)) as ReadableStream<Uint8Array>, size }
  } catch {
    return null
  }
}

export async function removeFile(key: string): Promise<void> {
  await rm(resolveKey(key), { force: true })
}
