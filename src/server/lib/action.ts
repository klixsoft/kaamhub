import "server-only"
import { z } from "zod"
import type { Permission } from "@/config/roles"
import { type CurrentUser, can, getCurrentUser } from "@/server/auth/session"
import type { ActionResult } from "@/types/action"
import { AppError } from "./errors"
import { logger } from "./logger"

interface ActionContext {
  user: CurrentUser
}

interface ActionOptions<TSchema extends z.ZodType, TData> {
  schema: TSchema
  permission?: Permission
  handler: (input: z.infer<TSchema>, context: ActionContext) => Promise<TData>
}

function formDataToObject(formData: FormData): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue
    const values = formData.getAll(key)
    result[key] = key.endsWith("[]") ? values : values[0]
  }
  return Object.fromEntries(Object.entries(result).map(([key, value]) => [key.replace(/\[\]$/, ""), value]))
}

async function execute<TSchema extends z.ZodType, TData>(
  options: ActionOptions<TSchema, TData>,
  raw: unknown,
): Promise<ActionResult<TData>> {
  const user = await getCurrentUser()
  if (!user) return { ok: false, error: "Your session has expired. Please sign in again." }
  if (options.permission && !can(user, options.permission)) {
    return { ok: false, error: "You do not have permission to do this." }
  }

  const parsed = options.schema.safeParse(raw)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Please correct the highlighted fields.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
    }
  }

  try {
    const data = await options.handler(parsed.data, { user })
    return { ok: true, data }
  } catch (error) {
    if (error instanceof AppError) return { ok: false, error: error.message }
    logger.error("Server action failed", { error })
    return { ok: false, error: "Something went wrong. Please try again." }
  }
}

export function formAction<TSchema extends z.ZodType, TData>(options: ActionOptions<TSchema, TData>) {
  return async (_previous: unknown, formData: FormData): Promise<ActionResult<TData>> =>
    execute(options, formDataToObject(formData))
}

export function action<TSchema extends z.ZodType, TData>(options: ActionOptions<TSchema, TData>) {
  return async (input: z.input<TSchema>): Promise<ActionResult<TData>> => execute(options, input)
}
