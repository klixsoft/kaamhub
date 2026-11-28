"use client"

import { ImageIcon, Trash2Icon, UploadIcon } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { type ChangeEvent, useActionState, useEffect, useRef, useTransition } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useServerAction } from "@/hooks/use-server-action"
import { removeLetterhead, saveLetterSettings } from "@/server/modules/letters/actions"
import type { LetterSettings } from "@/server/modules/settings/schema"

function LetterheadUpload({ hasLetterhead, version }: { hasLetterhead: boolean; version: string }) {
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
      const response = await fetch("/api/letters/letterhead", { method: "POST", body: form }).catch(() => null)
      const result = response ? ((await response.json()) as { ok: boolean; error?: string }) : { ok: false, error: "Check your connection and try again." }
      if (!result.ok) return void toast.error(result.error ?? "We couldn’t save the image.")
      toast.success("Letterhead saved")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <div className="flex aspect-[210/297] w-40 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40">
        {hasLetterhead ? (
          <Image src={`/api/letters/letterhead?v=${encodeURIComponent(version)}`} alt="Current letterhead" width={160} height={226} unoptimized className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="space-y-3 text-sm">
        <p>Upload your letterhead as one full A4 page (PNG or JPG, up to 5 MB), with your logo, address and footer where they should print. A4 at 150 dpi is 1240 × 1754 pixels.</p>
        <p className="text-muted-foreground">Letters issued earlier keep the letterhead they were issued with.</p>
        <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg" className="sr-only" onChange={upload} aria-label="Letterhead image" />
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
            <UploadIcon aria-hidden />
            {isUploading ? "Uploading…" : hasLetterhead ? "Replace letterhead" : "Upload letterhead"}
          </Button>
          {hasLetterhead ? (
            <Button type="button" variant="outline" disabled={isPending} onClick={() => run(() => removeLetterhead({}), "Letterhead removed", () => router.refresh())}>
              <Trash2Icon aria-hidden />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export function LetterSettingsForm({ defaults }: { defaults: LetterSettings }) {
  const [state, submit] = useActionState(saveLetterSettings, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (state?.ok) toast.success("Letter settings saved")
  }, [state])

  return (
    <div className="flex flex-col gap-8">
      <LetterheadUpload hasLetterhead={Boolean(defaults.letterheadKey)} version={defaults.letterheadKey} />
      <form action={submit} className="grid gap-4 sm:grid-cols-4">
        <div className="sm:col-span-4">
          <FormAlert state={state} />
          <p className="text-sm text-muted-foreground">
            Text is printed inside these margins, so it never covers your letterhead. Measure from the edge of the page to where text may start. Use a template&apos;s
            Preview to check.
          </p>
        </div>
        <FormField id="letters-top" label="Top (mm)" required errors={errors?.topMm}>
          <Input id="letters-top" name="topMm" type="number" step="0.5" min={0} max={150} defaultValue={defaults.topMm} required />
        </FormField>
        <FormField id="letters-bottom" label="Bottom (mm)" required errors={errors?.bottomMm}>
          <Input id="letters-bottom" name="bottomMm" type="number" step="0.5" min={0} max={150} defaultValue={defaults.bottomMm} required />
        </FormField>
        <FormField id="letters-left" label="Left (mm)" required errors={errors?.leftMm}>
          <Input id="letters-left" name="leftMm" type="number" step="0.5" min={0} max={60} defaultValue={defaults.leftMm} required />
        </FormField>
        <FormField id="letters-right" label="Right (mm)" required errors={errors?.rightMm}>
          <Input id="letters-right" name="rightMm" type="number" step="0.5" min={0} max={60} defaultValue={defaults.rightMm} required />
        </FormField>
        <FormField id="letters-prefix" label="Number prefix" errors={errors?.numberPrefix} description="LTR- gives LTR-2026-0001. Numbers restart each year." className="sm:col-span-2">
          <Input id="letters-prefix" name="numberPrefix" defaultValue={defaults.numberPrefix} className="font-mono" />
        </FormField>
        <div className="hidden sm:col-span-2 sm:block" />
        <FormField id="letters-signatory" label="Signatory name" errors={errors?.signatoryName} description="Printed under the signature line. Leave empty to leave it out." className="sm:col-span-2">
          <Input id="letters-signatory" name="signatoryName" defaultValue={defaults.signatoryName} />
        </FormField>
        <FormField id="letters-signatory-title" label="Signatory title" errors={errors?.signatoryTitle} className="sm:col-span-2">
          <Input id="letters-signatory-title" name="signatoryTitle" defaultValue={defaults.signatoryTitle} placeholder="e.g. Head of People" />
        </FormField>
        <div className="flex justify-end sm:col-span-4">
          <SubmitButton pendingLabel="Saving…">Save settings</SubmitButton>
        </div>
      </form>
    </div>
  )
}
