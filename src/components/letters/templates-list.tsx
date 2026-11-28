"use client"

import { ArchiveIcon, ArchiveRestoreIcon, EyeIcon, FileTextIcon, PencilIcon, PlusIcon, SparklesIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { FormDialog } from "@/components/forms/form-dialog"
import { EmptyState } from "@/components/layout/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useServerAction } from "@/hooks/use-server-action"
import { customPlaceholders } from "@/lib/letter-placeholders"
import { addStarterTemplates, setTemplateArchived } from "@/server/modules/letters/actions"
import type { LetterTemplateRow } from "@/server/modules/letters/queries"
import { TemplateForm } from "./template-form"

function TemplateItem({ template }: { template: LetterTemplateRow }) {
  const router = useRouter()
  const { isPending, run } = useServerAction()
  const [editing, setEditing] = useState(false)
  const fields = customPlaceholders(`${template.title}\n${template.body}`)

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 p-4">
      <div className="flex min-w-0 items-start gap-3">
        <FileTextIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
        <div className="min-w-0 space-y-1">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            {template.name}
            {template.archived ? <Badge variant="secondary">Archived</Badge> : null}
          </p>
          <p className="text-sm text-muted-foreground">{template.title}</p>
          {fields.length > 0 ? <p className="text-xs text-muted-foreground">Asks for: {fields.join(", ")}</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        <Button variant="ghost" size="sm" nativeButton={false} render={<a href={`/api/letters/templates/${template.id}/preview`} target="_blank" rel="noopener" />}>
          <EyeIcon aria-hidden />
          Preview
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
          <PencilIcon aria-hidden />
          Edit
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => run(() => setTemplateArchived({ templateId: template.id, archived: !template.archived }), template.archived ? "Template restored" : "Template archived", () => router.refresh())}
        >
          {template.archived ? <ArchiveRestoreIcon aria-hidden /> : <ArchiveIcon aria-hidden />}
          {template.archived ? "Restore" : "Archive"}
        </Button>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit {template.name}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <TemplateForm
              template={template}
              onSaved={() => {
                setEditing(false)
                router.refresh()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </li>
  )
}

export function TemplatesList({ templates }: { templates: LetterTemplateRow[] }) {
  const router = useRouter()
  const { isPending, run } = useServerAction()

  const addDialog = (
    <FormDialog
      title="Add template"
      className="sm:max-w-3xl"
      trigger={
        <Button>
          <PlusIcon aria-hidden />
          Add template
        </Button>
      }
    >
      {(close) => (
        <TemplateForm
          onSaved={() => {
            close()
            router.refresh()
          }}
        />
      )}
    </FormDialog>
  )

  const starters = (
    <Button variant="outline" disabled={isPending} onClick={() => run(() => addStarterTemplates({}), "Starter templates added", () => router.refresh())}>
      <SparklesIcon aria-hidden />
      Add starter templates
    </Button>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap justify-end gap-2">
        {templates.length > 0 ? starters : null}
        {addDialog}
      </div>
      {templates.length === 0 ? (
        <div className="rounded-lg border">
          <EmptyState
            icon={FileTextIcon}
            title="No templates yet"
            description="Start from offer, appointment, NDA, experience and salary templates and adapt them, or write your own."
            action={starters}
          />
        </div>
      ) : (
        <ul className="divide-y rounded-lg border">
          {templates.map((template) => (
            <TemplateItem key={template.id} template={template} />
          ))}
        </ul>
      )}
    </div>
  )
}
