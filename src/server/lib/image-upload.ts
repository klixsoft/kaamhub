import "server-only"
import { randomUUID } from "node:crypto"
import { readFile, saveFile } from "./storage"

export const IMAGE_TYPES = { png: "image/png", jpg: "image/jpeg" } as const
export type ImageExtension = keyof typeof IMAGE_TYPES

export type ImageUploadResult = { ok: true; key: string } | { ok: false; status: number; error: string }

function signatureMatches(bytes: Uint8Array, extension: ImageExtension): boolean {
  if (extension === "png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
}

/*
 * Accepts a PNG or JPG from a multipart request, checks the file's own
 * signature rather than trusting its name, and stores it under a random key.
 */
export async function receiveImage(request: Request, options: { folder: string; maxBytes: number }): Promise<ImageUploadResult> {
  const tooLarge = { ok: false, status: 413, error: `The image can be up to ${Math.round(options.maxBytes / 1024 / 1024)} MB.` } as const
  if (Number(request.headers.get("content-length") ?? 0) > options.maxBytes + 64 * 1024) return tooLarge

  const file = (await request.formData()).get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, status: 400, error: "Choose an image." }
  if (file.size > options.maxBytes) return tooLarge

  const name = file.name.toLowerCase()
  const extension: ImageExtension | null = name.endsWith(".png") ? "png" : name.endsWith(".jpg") || name.endsWith(".jpeg") ? "jpg" : null
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!extension || !signatureMatches(bytes, extension)) return { ok: false, status: 400, error: "Use a PNG or JPG image." }

  const key = `${options.folder}/${randomUUID()}.${extension}`
  await saveFile(key, bytes)
  return { ok: true, key }
}

export function imageExtension(key: string): ImageExtension {
  return key.endsWith(".png") ? "png" : "jpg"
}

export async function serveImage(key: string | null | undefined): Promise<Response> {
  const file = key ? await readFile(key) : null
  if (!key || !file) return new Response("Not found", { status: 404 })
  return new Response(file.stream, {
    headers: { "Content-Type": IMAGE_TYPES[imageExtension(key)], "Content-Length": String(file.size), "Cache-Control": "private, no-store" },
  })
}
