import { z } from "zod"
import { PRIORITIES, PROJECT_STATUSES, REPOSITORY_LABELS, TASK_TYPES, TASK_VISIBILITIES } from "@/config/domain"
import { PROJECT_ROLES } from "@/config/roles"

const emptyToNull = (value: string) => (value === "" ? null : value)

const optionalDate = z.string().trim().transform(emptyToNull).pipe(z.iso.date("Enter a valid date").nullable()).nullish()
const optionalUuid = z.string().trim().transform(emptyToNull).pipe(z.uuid().nullable()).nullish()
const optionalText = (max: number) => z.string().trim().max(max).transform(emptyToNull).nullish()

export const projectSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z][A-Z0-9-]{1,15}$/, "Use 2–16 letters, numbers or dashes, starting with a letter"),
    name: z.string().trim().min(2, "Enter the project name").max(160),
    description: optionalText(5000),
    clientId: optionalUuid,
    status: z.enum(PROJECT_STATUSES),
    categoryId: optionalUuid,
    priority: z.enum(PRIORITIES),
    startDate: optionalDate,
    dueDate: optionalDate,
    managerId: optionalText(64),
    stageId: optionalUuid,
  })
  .refine((value) => !value.startDate || !value.dueDate || value.dueDate >= value.startDate, {
    path: ["dueDate"],
    message: "Deadline must be on or after the start date",
  })

export type ProjectInput = z.infer<typeof projectSchema>

export const memberAssignmentSchema = z.object({
  projectId: z.uuid(),
  userId: z.string().min(1, "Choose a person"),
  role: z.enum(PROJECT_ROLES),
})

export const memberRemovalSchema = z.object({ projectId: z.uuid(), userId: z.string().min(1) })

export const repositoryLinkSchema = z.object({
  projectId: z.uuid(),
  repositoryId: z.uuid({ message: "Choose a repository" }),
  label: z.enum(REPOSITORY_LABELS),
})

export const repositoryCreateSchema = z.object({
  projectId: z.uuid(),
  name: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9._-]{1,100}$/, "Use letters, numbers, dots, dashes or underscores"),
  description: optionalText(350),
  isPrivate: z.stringbool(),
  label: z.enum(REPOSITORY_LABELS),
})

export const repositoryUnlinkSchema = z.object({ projectId: z.uuid(), repositoryId: z.uuid() })

export const taskSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(2, "Enter a title").max(200),
  description: optionalText(10000),
  type: z.enum(TASK_TYPES),
  priority: z.enum(PRIORITIES),
  visibility: z.enum(TASK_VISIBILITIES),
  columnId: z.uuid(),
  dueDate: optionalDate,
  estimateHours: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number("Enter a number of hours").min(0).max(9999).nullable())
    .nullish(),
  assigneeIds: z.array(z.string().min(1)).max(20).default([]),
})

export const taskUpdateSchema = taskSchema.safeExtend({ taskId: z.uuid() })

export const taskMoveSchema = z.object({
  taskId: z.uuid(),
  columnId: z.uuid(),
  beforeTaskId: z.uuid().nullable(),
  afterTaskId: z.uuid().nullable(),
})

export const taskDeleteSchema = z.object({ taskId: z.uuid() })
