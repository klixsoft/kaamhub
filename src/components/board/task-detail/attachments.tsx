"use client"

import { DownloadIcon, EyeIcon, PaperclipIcon, Trash2Icon, UploadIcon } from "lucide-react"
import { type ChangeEvent, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DOCUMENT_ACCEPT, DOCUMENT_MAX_BYTES, formatFileSize } from "@/config/documents"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDateTime } from "@/lib/format"
import { deleteAttachment } from "@/server/modules/tasks/actions"
import type { TaskDetail } from "@/server/modules/tasks/queries"

interface AttachmentsProps {
  taskId: string
  attachments: TaskDetail["attachments"]
  canUpload: boolean
  allowClientVisibility: boolean
  isClientViewer: boolean
  onChange: () => void
}

const fileUrl = (id: string) => `/api/task-attachments/${id}`

export function Attachments({ taskId, attachments, canUpload, allowClientVisibility, isClientViewer, onChange }: AttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, startUpload] = useTransition()
  const [shareWithClient, setShareWithClient] = useState(false)
  const { isPending, run } = useServerAction()

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (file.size > DOCUMENT_MAX_BYTES) return void toast.error(`Files can be up to ${formatFileSize(DOCUMENT_MAX_BYTES)}.`)
    const form = new FormData()
    form.set("file", file)
    form.set("visibility", isClientViewer || shareWithClient ? "client" : "internal")
    startUpload(async () => {
      const response = await fetch(`/api/tasks/${taskId}/attachments`, { method: "POST", body: form }).catch(() => null)
      const result = response ? ((await response.json()) as { ok: boolean; error?: string }) : { ok: false, error: "Check your connection and try again." }
      if (!result.ok) return void toast.error(result.error ?? "We couldn’t upload this file.")
      toast.success(`${file.name} attached`)
      onChange()
    })
  }

  if (attachments.length === 0 && !canUpload) return null

  return (
    <section aria-labelledby={`attachments-${taskId}`} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`attachments-${taskId}`} className="flex items-center gap-2 text-sm font-semibold">
          <PaperclipIcon className="size-4" aria-hidden />
          Attachments
          {attachments.length > 0 ? <span className="font-normal text-muted-foreground">{attachments.length}</span> : null}
        </h3>
        {canUpload ? (
          <div className="flex items-center gap-3">
            {allowClientVisibility && !isClientViewer ? (
              <label htmlFor={`attachment-share-${taskId}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox id={`attachment-share-${taskId}`} checked={shareWithClient} onCheckedChange={(checked) => setShareWithClient(checked === true)} />
                Visible to client
              </label>
            ) : null}
            <input ref={inputRef} type="file" accept={DOCUMENT_ACCEPT} className="sr-only" onChange={upload} aria-label="Attach a file" />
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              <UploadIcon aria-hidden />
              {isUploading ? "Uploading…" : "Attach file"}
            </Button>
          </div>
        ) : null}
      </div>
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No files yet. Attach screenshots, mockups or documents up to {formatFileSize(DOCUMENT_MAX_BYTES)}.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
              <div className="min-w-0">
                <a href={fileUrl(attachment.id)} target="_blank" rel="noopener" className="block truncate font-medium hover:underline">
                  {attachment.fileName}
                </a>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {formatFileSize(attachment.sizeBytes)} · {attachment.uploadedBy ?? "Someone"} · {formatDateTime(attachment.createdAt)}
                  {!isClientViewer && attachment.visibility === "client" ? (
                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                      <EyeIcon aria-hidden />
                      Client
                    </Badge>
                  ) : null}
                </p>
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon-sm" nativeButton={false} aria-label={`Download ${attachment.fileName}`} render={<a href={`${fileUrl(attachment.id)}?download`} download />}>
                  <DownloadIcon />
                </Button>
                {attachment.canDelete ? (
                  <ConfirmDialog
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`Remove ${attachment.fileName}`} disabled={isPending}>
                        <Trash2Icon />
                      </Button>
                    }
                    title={`Remove ${attachment.fileName}?`}
                    description="The file is deleted for everyone who can see this card."
                    confirmLabel="Remove"
                    destructive
                    onConfirm={() => run(() => deleteAttachment({ attachmentId: attachment.id }), "Attachment removed", onChange)}
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
