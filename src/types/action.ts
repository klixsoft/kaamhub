export type FieldErrors = Partial<Record<string, string[]>>

export type ActionResult<TData = undefined> =
  | { ok: true; data: TData; message?: string }
  | { ok: false; error: string; fieldErrors?: FieldErrors }

export type ActionState<TData = undefined> = ActionResult<TData> | null
