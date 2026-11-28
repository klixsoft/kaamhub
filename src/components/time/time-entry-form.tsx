"use client"

import { type FormEvent, useState, useTransition } from "react"
import { toast } from "sonner"
import { DatePicker } from "@/components/forms/date-picker"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { formatMinutes, parseDuration } from "@/lib/duration"
import type { Option } from "@/lib/options"
import { logTime, updateTimeEntry } from "@/server/modules/time/actions"

interface ExistingEntry {
  id: string
  workDate: string
  minutes: number
  note: string | null
  billable: boolean
}

interface TimeEntryFormProps {
  today: string
  projectId?: string
  taskId?: string
  entry?: ExistingEntry
  onSaved: () => void
}

export function TimeEntryForm({ today, projectId: fixedProjectId, taskId: fixedTaskId, entry, onSaved }: TimeEntryFormProps) {
  const [isPending, startTransition] = useTransition()
  const [project, setProject] = useState<Option | null>(null)
  const [card, setCard] = useState<Option | null>(null)
  const [workDate, setWorkDate] = useState<string | null>(entry?.workDate ?? today)
  const [duration, setDuration] = useState(entry ? formatMinutes(entry.minutes) : "")
  const [billable, setBillable] = useState(entry?.billable ?? true)
  const [error, setError] = useState<string | null>(null)
  const projectId = fixedProjectId ?? project?.value ?? null
  const preview = parseDuration(duration)
  const prefix = entry?.id ?? fixedTaskId ?? "timesheet"

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const note = String(new FormData(event.currentTarget).get("note") ?? "")
    if (!workDate) return setError("Choose the date.")
    if (!entry && !projectId) return setError("Choose the project.")
    startTransition(async () => {
      const result = entry
        ? await updateTimeEntry({ entryId: entry.id, workDate, duration, note, billable })
        : await logTime({ projectId: projectId as string, taskId: fixedTaskId ?? card?.value ?? null, workDate, duration, note, billable })
      if (!result.ok) return setError(result.fieldErrors?.duration?.[0] ?? result.error)
      toast.success(entry ? "Time updated" : `${formatMinutes(preview ?? 0)} logged`)
      onSaved()
    })
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      {error ? (
        <Alert variant="destructive" role="alert" className="sm:col-span-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {!entry && !fixedProjectId ? (
        <>
          <FormField id={`${prefix}-project`} label="Project" required>
            <OptionCombobox
              id={`${prefix}-project`}
              resource="my-projects"
              value={project}
              onChange={(value) => {
                setProject(value)
                setCard(null)
              }}
              placeholder="Choose a project"
            />
          </FormField>
          <FormField id={`${prefix}-card`} label="Card">
            <OptionCombobox
              key={projectId ?? "none"}
              id={`${prefix}-card`}
              resource="project-tasks"
              resourceParams={projectId ? { projectId } : undefined}
              value={card}
              onChange={setCard}
              disabled={!projectId}
              placeholder="Search by number or title"
            />
          </FormField>
        </>
      ) : null}
      <FormField id={`${prefix}-date`} label="Date" required>
        <DatePicker id={`${prefix}-date`} value={workDate} onChange={setWorkDate} required />
      </FormField>
      <FormField id={`${prefix}-duration`} label="Time spent" required description={preview ? `= ${formatMinutes(preview)}` : "e.g. 1.5, 1h 30m or 45m"}>
        <Input id={`${prefix}-duration`} value={duration} onChange={(event) => setDuration(event.target.value)} inputMode="decimal" autoComplete="off" required />
      </FormField>
      <FormField id={`${prefix}-note`} label="What did you work on?" className="sm:col-span-2">
        <Input id={`${prefix}-note`} name="note" defaultValue={entry?.note ?? ""} maxLength={500} />
      </FormField>
      <div className="flex items-center justify-between gap-3 sm:col-span-2">
        <label htmlFor={`${prefix}-billable`} className="flex items-center gap-2 text-sm">
          <Checkbox id={`${prefix}-billable`} checked={billable} onCheckedChange={(checked) => setBillable(checked === true)} />
          Billable to the client
        </label>
        <SubmitButton pending={isPending} pendingLabel="Saving…" size="sm">
          {entry ? "Save" : "Log time"}
        </SubmitButton>
      </div>
    </form>
  )
}
