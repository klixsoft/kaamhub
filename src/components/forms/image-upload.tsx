"use client"

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type ChangeEvent, type ReactNode, useRef, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useServerAction } from "@/hooks/use-server-action"
import { cn } from "@/lib/utils"
import type { ActionResult } from "@/types/action"

interface ImageUploadProps {
  endpoint: string
  imageKey: string
  label: string
  description: ReactNode
  previewClassName: string
  previewSize: { width: number; height: number }
  removeAction: (input: Record<string, never>) => Promise<ActionResult<undefined>>
}

export function ImageUpload({ endpoint, imageKey, label, description, previewClassName, previewSize, removeAction }: ImageUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, startUpload] = useTransition()
  const { isPending, run } = useServerAction()

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    const form = new FormData()
    form.set("file", file)
    startUpload(async () => {
      const response = await fetch(endpoint, { method: "POST", body: form }).catch(() => null)
      const result = response ? ((await response.json()) as { ok: boolean; error?: string }) : { ok: false, error: "Check your connection and try again." }
      if (!result.ok) return void toast.error(result.error ?? "We couldn’t save the image.")
      toast.success(`${label} saved`)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40", previewClassName)}>
        {imageKey ? (
          <Image src={`${endpoint}?v=${encodeURIComponent(imageKey)}`} alt={`Current ${label.toLowerCase()}`} width={previewSize.width} height={previewSize.height} unoptimized className="size-full object-contain" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-3 text-sm">
        {description}
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg" className="sr-only" onChange={upload} aria-label={label} />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            <UploadIcon aria-hidden />
            {isUploading ? "Uploading…" : imageKey ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
          </Button>
          {imageKey ? (
            <Button type="button" variant="outline" disabled={isPending} onClick={() => run(() => removeAction({}), `${label} removed`, () => router.refresh())}>
              <Trash2Icon aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
