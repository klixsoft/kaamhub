"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { FormField } from "@/components/forms/form-field"
import { OptionCombobox } from "@/components/forms/option-combobox"
import { SubmitButton } from "@/components/forms/submit-button"
import { DatePicker } from "@/components/forms/date-picker"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  PRIORITY_LABELS,
  type Priority,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPE_LABELS,
  type ProjectStatus,
  type ProjectType,
} from "@/config/domain"
import { type Option, toOptions } from "@/lib/options"
import { createProject, updateProject } from "@/server/modules/projects/actions"

const statusOptions = toOptions(PROJECT_STATUS_LABELS)
const typeOptions = toOptions(PROJECT_TYPE_LABELS)
const priorityOptions = toOptions(PRIORITY_LABELS)
const pick = (options: Option[], value: string) => options.find((option) => option.value === value) ?? null

export interface ProjectFormDefaults {
  id: string
  code: string
  name: string
  description: string | null
  status: ProjectStatus
  type: ProjectType
  priority: Priority
  startDate: string | null
  dueDate: string | null
  client: Option | null
  managesInfrastructure: boolean
}

export function ProjectForm({ defaults, codePrefix = "" }: { defaults?: ProjectFormDefaults; codePrefix?: string }) {
  const router = useRouter()
  const [state, submit] = useActionState(defaults ? updateProject : createProject, null)
  const errors = state && !state.ok ? state.fieldErrors : undefined
  const invalid = (field: string) => Boolean(errors?.[field]) || undefined
  const [managesInfrastructure, setManagesInfrastructure] = useState(defaults?.managesInfrastructure ?? false)

  useEffect(() => {
    if (!state?.ok) return
    toast.success(defaults ? "Project updated" : "Project created")
    if (!defaults) router.push(`/projects/${state.data.id}`)
  }, [state, defaults, router])

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      {defaults ? <input type="hidden" name="projectId" value={defaults.id} /> : null}
      <div className="sm:col-span-2">
        <FormAlert state={state} />
      </div>
      <FormField id="project-name" label="Project name" required errors={errors?.name}>
        <Input id="project-name" name="name" defaultValue={defaults?.name} required aria-invalid={invalid("name")} />
      </FormField>
      <FormField id="project-code" label="Code" required errors={errors?.code} description="Short unique code used in task IDs, e.g. WEB.">
        <Input
          id="project-code"
          name="code"
          defaultValue={defaults?.code ?? codePrefix}
          required
          maxLength={16}
          className="font-mono uppercase"
          aria-invalid={invalid("code")}
        />
      </FormField>
      <FormField id="project-client" label="Client" errors={errors?.clientId}>
        <OptionCombobox id="project-client" name="clientId" resource="clients" defaultValue={defaults?.client} placeholder="Internal project" />
      </FormField>
      {defaults ? null : (
        <FormField id="project-manager" label="Project manager" errors={errors?.managerId}>
          <OptionCombobox id="project-manager" name="managerId" resource="people" placeholder="Search people…" />
        </FormField>
      )}
      <FormField id="project-status" label="Status" required errors={errors?.status}>
        <OptionCombobox id="project-status" name="status" required options={statusOptions} defaultValue={pick(statusOptions, defaults?.status ?? "planning")} />
      </FormField>
      <FormField id="project-type" label="Type" required errors={errors?.type}>
        <OptionCombobox id="project-type" name="type" required options={typeOptions} defaultValue={pick(typeOptions, defaults?.type ?? "software")} />
      </FormField>
      <FormField id="project-priority" label="Priority" required errors={errors?.priority}>
        <OptionCombobox
          id="project-priority"
          name="priority"
          required
          options={priorityOptions}
          defaultValue={pick(priorityOptions, defaults?.priority ?? "medium")}
        />
      </FormField>
      <FormField id="project-start" label="Start date" errors={errors?.startDate}>
        <DatePicker id="project-start" name="startDate" defaultValue={defaults?.startDate} />
      </FormField>
      <FormField id="project-due" label="Deadline" errors={errors?.dueDate}>
        <DatePicker id="project-due" name="dueDate" defaultValue={defaults?.dueDate} invalid={invalid("dueDate")} />
      </FormField>
      <FormField id="project-description" label="Description" errors={errors?.description} className="sm:col-span-2">
        <Textarea id="project-description" name="description" rows={4} defaultValue={defaults?.description ?? ""} />
      </FormField>
      <label htmlFor="project-manages-infrastructure" className="flex items-start gap-3 text-sm sm:col-span-2">
        <Switch id="project-manages-infrastructure" checked={managesInfrastructure} onCheckedChange={setManagesInfrastructure} />
        <input type="hidden" name="managesInfrastructure" value={String(managesInfrastructure)} />
        <span>
          <span className="block font-medium">We manage the domain and hosting</span>
          <span className="text-muted-foreground">Adds a Services tab to track renewals and bill the client on a recurring schedule.</span>
        </span>
      </label>
      <div className="flex justify-end sm:col-span-2">
        <SubmitButton pendingLabel="Saving…">{defaults ? "Save changes" : "Create project"}</SubmitButton>
      </div>
    </form>
  )
}
