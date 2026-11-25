"use client"

import { useRouter } from "next/navigation"
import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Input } from "@/components/ui/input"
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, formatFileSize } from "@/config/documents"
import { TASK_VISIBILITY_LABELS } from "@/config/domain"
import { toOptions } from "@/lib/options"
import { updateDocument } from "@/server/modules/documents/actions"
import type { DocumentRow } from "@/server/modules/documents/queries"
import type { UploadResult } from "@/server/modules/documents/upload"
import type { ActionState } from "@/types/action"

const visibilityOptions = toOptions(TASK_VISIBILITY_LABELS)

interface DocumentFormProps {
  projectId: string
  document?: DocumentRow
  onSaved: () => void
}

async function upload(projectId: string, form: FormData): Promise<UploadResult> {
  try {
    const response = await fetch(`/api/projects/${projectId}/documents`, { method: "POST", body: form })
    return (await response.json()) as UploadResult
  } catch {
    return { ok: false, error: "We couldn’t upload this file. Check your connection and try again." }
  }
}

export function DocumentForm({ projectId, document, onSaved }: DocumentFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<ActionState<unknown>>(null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const result = document
        ? await updateDocument({
            documentId: document.id,
            title: String(form.get("title") ?? ""),
            visibility: form.get("visibility") === "client" ? "client" : "internal",
          })
        : await upload(projectId, form)
      setState(result)
      if (!result.ok) return
      toast.success(document ? "Document updated" : "Document uploaded")
      router.refresh()
      onSaved()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
      <FormAlert state={state} />
      {document ? null : (
        <FormField
          id="document-file"
          label="File"
          required
          errors={errors?.file}
          description={`PDF, Word, Excel, PowerPoint, OpenDocument, text, images or ZIP. Up to ${formatFileSize(DOCUMENT_MAX_BYTES)}.`}
        >
          <Input id="document-file" name="file" type="file" accept={DOCUMENT_ACCEPT} required aria-invalid={Boolean(errors?.file) || undefined} />
        </FormField>
      )}
      <FormField
        id="document-title"
        label="Title"
        required={Boolean(document)}
        errors={errors?.title}
        description={document ? undefined : "e.g. Software requirements specification. Leave empty to use the file name."}
      >
        <Input id="document-title" name="title" defaultValue={document?.title} maxLength={160} aria-invalid={Boolean(errors?.title) || undefined} />
      </FormField>
      <FormField id="document-visibility" label="Visibility" required description="Client-visible documents can be opened by the client's portal contacts.">
        <OptionCombobox
          id="document-visibility"
          name="visibility"
          required
          options={visibilityOptions}
          defaultValue={visibilityOptions.find((option) => option.value === (document?.visibility ?? "internal")) ?? null}
        />
      </FormField>
      <div className="flex justify-end">
        <SubmitButton pending={isPending} pendingLabel={document ? "Saving…" : "Uploading…"}>
          {document ? "Save changes" : "Upload document"}
        </SubmitButton>
      </div>
    </form>
  )
}
