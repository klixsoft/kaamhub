"use client"

import { XIcon } from "lucide-react"
import { useActionState, useEffect, useRef } from "react"
import { SubmitButton } from "@/components/forms/submit-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useServerAction } from "@/hooks/use-server-action"
import { addLookup, removeLookup } from "@/server/modules/settings/actions"
import type { LookupKind } from "@/server/modules/settings/schema"

interface LookupListProps {
  kind: LookupKind
  label: string
  items: Array<{ id: string; name: string }>
}

export function LookupList({ kind, label, items }: LookupListProps) {
  const [state, submit] = useActionState(addLookup, null)
  const { isPending, run } = useServerAction()
  const formRef = useRef<HTMLFormElement>(null)
  const error = state && !state.ok ? (state.fieldErrors?.name?.[0] ?? state.error) : null

  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <div className="flex flex-col gap-3">
      <form ref={formRef} action={submit} className="flex items-start gap-2">
        <input type="hidden" name="kind" value={kind} />
        <Field data-invalid={Boolean(error) || undefined} className="flex-1">
          <Input name="name" aria-label={`New ${label.toLowerCase()}`} placeholder={`Add ${label.toLowerCase()}…`} aria-invalid={Boolean(error) || undefined} />
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <SubmitButton variant="outline">Add</SubmitButton>
      </form>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">None added yet.</p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label={label}>
          {items.map((item) => (
            <li key={item.id}>
              <Badge variant="secondary" className="h-7 gap-1 pr-1 text-sm">
                {item.name}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  disabled={isPending}
                  aria-label={`Remove ${item.name}`}
                  onClick={() => run(() => removeLookup({ kind, id: item.id }))}
                >
                  <XIcon />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
