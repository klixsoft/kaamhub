"use client"

import { useActionState, useEffect } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { DatePicker } from "@/components/forms/date-picker"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { PRIORITY_LABELS, TASK_TYPE_LABELS, TASK_VISIBILITY_LABELS } from "@/config/domain"
import { type Option, toOptions } from "@/lib/options"
import type { BoardColumn, BoardTask } from "@/server/modules/projects/board"
import { createTask, updateTask } from "@/server/modules/projects/task-actions"

const typeOptions = toOptions(TASK_TYPE_LABELS)
const priorityOptions = toOptions(PRIORITY_LABELS)
const visibilityOptions = toOptions(TASK_VISIBILITY_LABELS)
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null

interface TaskFormProps {
  projectId: string
  columns: BoardColumn[]
  task?: BoardTask
  defaultColumnId: string
  onSaved: () => void
}

export function TaskForm({ projectId, columns, task, defaultColumnId, onSaved }: TaskFormProps) {
  const [state, submit] = useActionState(task ? updateTask : createTask, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const columnOptions = columns.map((column) => ({ value: column.id, label: column.name }))

  useEffect(() => {
    if (!state?.ok) return
    toast.success(task ? "Task updated" : "Task created")
    onSaved()
  }, [state, task, onSaved])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="projectId" value={projectId} />
      {task ? <input type="hidden" name="taskId" value={task.id} /> : null}
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="task-title" label="Title" required errors={errors?.title} className="sm:col-span-2">
        <Input id="task-title" name="title" defaultValue={task?.title} required autoFocus aria-invalid={Boolean(errors?.title) || undefined} />
      </FormField>
      <FormField id="task-description" label="Description" errors={errors?.description} className="sm:col-span-2">
        <Textarea id="task-description" name="description" rows={5} defaultValue={task?.description ?? ""} />
      </FormField>
      <FormField id="task-column" label="Status" required errors={errors?.columnId}>
        <OptionCombobox id="task-column" name="columnId" required options={columnOptions} defaultValue={pick(columnOptions, task?.columnId ?? defaultColumnId)} />
      </FormField>
      <FormField id="task-type" label="Type" required errors={errors?.type}>
        <OptionCombobox id="task-type" name="type" required options={typeOptions} defaultValue={pick(typeOptions, task?.type ?? "task")} />
      </FormField>
      <FormField id="task-priority" label="Priority" required errors={errors?.priority}>
        <OptionCombobox id="task-priority" name="priority" required options={priorityOptions} defaultValue={pick(priorityOptions, task?.priority ?? "medium")} />
      </FormField>
      <FormField
        id="task-visibility"
        label="Visibility"
        required
        errors={errors?.visibility}
        description="Client-visible tasks appear on the client's read-only board."
      >
        <OptionCombobox
          id="task-visibility"
          name="visibility"
          required
          options={visibilityOptions}
          defaultValue={pick(visibilityOptions, task?.visibility ?? "internal")}
        />
      </FormField>
      <FormField id="task-assignees" label="Assignees" errors={errors?.assigneeIds} className="sm:col-span-2">
        <OptionCombobox
          id="task-assignees"
          name="assigneeIds"
          multiple
          resource="project-members"
          resourceParams={{ projectId }}
          defaultValue={task?.assignees.map((assignee) => ({ value: assignee.id, label: assignee.name })) ?? []}
          placeholder="Search project members…"
        />
      </FormField>
      <FormField id="task-due" label="Due date" errors={errors?.dueDate}>
        <DatePicker id="task-due" name="dueDate" defaultValue={task?.dueDate} />
      </FormField>
      <FormField id="task-estimate" label="Estimate (hours)" errors={errors?.estimateHours}>
        <Input id="task-estimate" name="estimateHours" type="number" min={0} step={0.25} defaultValue={task?.estimateHours ?? ""} />
      </FormField>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{task ? "Save task" : "Create task"}</SubmitButton>
      </div>
    </form>
  )
}
