"use client"

import { FileSignatureIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import { type ReactElement, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/components/forms/date-picker"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { customPlaceholderLabel, fillPlaceholders, ISSUE_TIME_PLACEHOLDERS, LETTER_PLACEHOLDERS, type LetterPlaceholder, placeholdersIn } from "@/lib/letter-placeholders"
import type { Option } from "@/lib/options"
import { getLetterValues, issueLetter } from "@/server/modules/letters/actions"
import type { LetterTemplateRow } from "@/server/modules/letters/queries"

interface IssueLetterDialogProps {
  templates: Pick<LetterTemplateRow, "id" | "name" | "title" | "body">[]
  recipient?: Option
  today: string
  trigger?: ReactElement
}

function fieldLabel(key: string): string {
  return key in LETTER_PLACEHOLDERS ? LETTER_PLACEHOLDERS[key as LetterPlaceholder] : customPlaceholderLabel(key)
}

export function IssueLetterDialog({ templates, recipient: fixedRecipient, today, trigger }: IssueLetterDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [recipient, setRecipient] = useState<Option | null>(fixedRecipient ?? null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [fields, setFields] = useState<Record<string, string>>({})
  const [letterDate, setLetterDate] = useState<string | null>(today)
  const [sendEmail, setSendEmail] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const templateOptions = useMemo(() => templates.map((template) => ({ value: template.id, label: template.name })), [templates])
  const openFields = useMemo(
    () => placeholdersIn(`${title}\n${body}`).filter((key) => !ISSUE_TIME_PLACEHOLDERS.includes(key as LetterPlaceholder)),
    [title, body],
  )

  function reset() {
    setRecipient(fixedRecipient ?? null)
    setTemplateId(null)
    setTitle("")
    setBody("")
    setFields({})
    setLetterDate(today)
    setSendEmail(true)
    setError(null)
  }

  function load(nextRecipient: Option | null, nextTemplateId: string | null) {
    const template = templates.find((item) => item.id === nextTemplateId)
    if (!nextRecipient || !template) return
    startTransition(async () => {
      const result = await getLetterValues({ recipientId: nextRecipient.value })
      if (!result.ok) return setError(result.error)
      setError(null)
      setTitle(fillPlaceholders(template.title, result.data))
      setBody(fillPlaceholders(template.body, result.data))
      setFields({})
    })
  }

  function issue() {
    if (!recipient || !letterDate) return setError("Choose the person and the letter date.")
    const missing = openFields.filter((key) => !fields[key]?.trim())
    if (missing.length > 0) return setError(`Fill in: ${missing.map(fieldLabel).join(", ")}.`)
    const values = Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value.trim()]))
    startTransition(async () => {
      const result = await issueLetter({
        recipientId: recipient.value,
        templateId,
        title: fillPlaceholders(title, values),
        body: fillPlaceholders(body, values),
        letterDate,
        sendEmail,
      })
      if (!result.ok) return setError(result.error)
      toast.success(`Letter ${result.data.number} issued${sendEmail ? " and is being emailed" : ""}`)
      setOpen(false)
      reset()
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger
        render={
          trigger ?? (
            <Button>
              <FileSignatureIcon aria-hidden />
              Issue letter
            </Button>
          )
        }
      />
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Issue a letter</DialogTitle>
          <DialogDescription>Choose a template, check the text and issue it. The letter gets the next number and is printed on your letterhead.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          {error ? (
            <Alert variant="destructive" role="alert" className="sm:col-span-2">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {fixedRecipient ? null : (
            <FormField id="letter-recipient" label="Person" required>
              <OptionCombobox
                id="letter-recipient"
                resource="people"
                value={recipient}
                onChange={(value) => {
                  setRecipient(value)
                  load(value, templateId)
                }}
                placeholder="Search people…"
              />
            </FormField>
          )}
          <FormField id="letter-template" label="Template" required className={fixedRecipient ? "sm:col-span-2" : undefined}>
            <OptionCombobox
              id="letter-template"
              options={templateOptions}
              value={templateOptions.find((option) => option.value === templateId) ?? null}
              onChange={(value) => {
                setTemplateId(value?.value ?? null)
                load(recipient, value?.value ?? null)
              }}
              placeholder="Choose a template"
              emptyText="No templates yet. Add them under Letters → Templates."
            />
          </FormField>
          {title || body ? (
            <>
              <FormField id="letter-title" label="Heading" required>
                <Input id="letter-title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </FormField>
              <FormField id="letter-date" label="Letter date" required>
                <DatePicker id="letter-date" value={letterDate} onChange={setLetterDate} required />
              </FormField>
              {openFields.length > 0 ? (
                <fieldset className="grid gap-4 rounded-lg border p-4 sm:col-span-2 sm:grid-cols-2">
                  <legend className="px-1 text-sm font-medium">Details for this letter</legend>
                  {openFields.map((key) => (
                    <FormField key={key} id={`letter-field-${key}`} label={fieldLabel(key)} required>
                      <Input
                        id={`letter-field-${key}`}
                        value={fields[key] ?? ""}
                        onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))}
                      />
                    </FormField>
                  ))}
                </fieldset>
              ) : null}
              <FormField
                id="letter-body"
                label="Letter text"
                required
                className="sm:col-span-2"
                description="Edit freely. Blank lines start new paragraphs, # starts a heading, - starts a bullet and **text** is bold. The letter number and date are added when you issue it."
              >
                <Textarea id="letter-body" value={body} onChange={(event) => setBody(event.target.value)} rows={14} className="font-mono text-sm" />
              </FormField>
              <label htmlFor="letter-email" className="flex items-start gap-3 rounded-lg border p-4 text-sm sm:col-span-2">
                <Switch id="letter-email" checked={sendEmail} onCheckedChange={setSendEmail} />
                <span>
                  <span className="block font-medium">Email the PDF to {recipient?.label ?? "the person"}</span>
                  <span className="text-muted-foreground">They can also download it any time under My profile → My letters.</span>
                </span>
              </label>
            </>
          ) : null}
          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={issue} disabled={isPending || !title || !body}>
              {isPending ? "Working…" : "Issue letter"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
