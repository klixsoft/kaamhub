"use client"

import { useActionState, useEffect, useRef } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { SubmitButton } from "@/components/forms/submit-button"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { LETTER_PLACEHOLDERS, type LetterPlaceholder } from "@/lib/letter-placeholders"
import { createTemplate, updateTemplate } from "@/server/modules/letters/actions"
import type { LetterTemplateRow } from "@/server/modules/letters/queries"

interface TemplateFormProps {
  template?: LetterTemplateRow
  onSaved: () => void
}

export function TemplateForm({ template, onSaved }: TemplateFormProps) {
  const [state, submit] = useActionState(template ? updateTemplate : createTemplate, null)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const errors = state && !state.ok ? state.fieldErrors : undefined

  useEffect(() => {
    if (!state?.ok) return
    toast.success(template ? "Template saved" : "Template added")
    onSaved()
  }, [state, template, onSaved])

  function insert(key: string) {
    const textarea = bodyRef.current
    if (!textarea) return
    const token = `{{${key}}}`
    const { selectionStart, selectionEnd, value } = textarea
    textarea.value = `${value.slice(0, selectionStart)}${token}${value.slice(selectionEnd)}`
    textarea.focus()
    textarea.setSelectionRange(selectionStart + token.length, selectionStart + token.length)
  }

  return (
    <form action={submit} className="flex flex-col gap-4">
      <FormAlert state={state} />
      {template ? <input type="hidden" name="templateId" value={template.id} /> : null}
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="template-name" label="Template name" required errors={errors?.name} description="Only you see this, e.g. Offer letter – engineering.">
          <Input id="template-name" name="name" defaultValue={template?.name} required />
        </FormField>
        <FormField id="template-title" label="Heading on the letter" required errors={errors?.title}>
          <Input id="template-title" name="title" defaultValue={template?.title} required />
        </FormField>
      </div>
      <FormField
        id="template-body"
        label="Letter text"
        required
        errors={errors?.body}
        description="Blank lines start new paragraphs, # starts a heading, - starts a bullet and **text** is bold. Your own placeholders, such as {{salary}}, are asked for when the letter is issued."
      >
        <Textarea id="template-body" ref={bodyRef} name="body" defaultValue={template?.body} rows={16} className="font-mono text-sm" required />
      </FormField>
      <div className="space-y-2">
        <p className="text-sm font-medium">Insert a placeholder</p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(LETTER_PLACEHOLDERS) as LetterPlaceholder[]).map((key) => (
            <Button key={key} type="button" variant="outline" size="xs" onClick={() => insert(key)} title={`{{${key}}}`}>
              {LETTER_PLACEHOLDERS[key]}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">{template ? "Save template" : "Add template"}</SubmitButton>
      </div>
    </form>
  )
}
