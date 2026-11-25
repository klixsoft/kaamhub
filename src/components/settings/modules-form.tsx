"use client"

import { useActionState, useEffect, useState } from "react"
import { toast } from "sonner"
import { FormAlert } from "@/components/forms/form-alert"
import { SubmitButton } from "@/components/forms/submit-button"
import { Switch } from "@/components/ui/switch"
import { MODULE_INFO, MODULES, type ModuleState } from "@/config/modules"
import { saveModuleSettings } from "@/server/modules/settings/actions"

export function ModulesForm({ defaults }: { defaults: ModuleState }) {
  const [state, submit] = useActionState(saveModuleSettings, null)
  const [values, setValues] = useState(defaults)

  useEffect(() => {
    if (state?.ok) toast.success("Modules updated")
  }, [state])

  return (
    <form action={submit} className="flex flex-col gap-4">
      <FormAlert state={state} />
      <ul className="divide-y rounded-lg border">
        {MODULES.map((key) => {
          const info = MODULE_INFO[key]
          const blockedBy = info.requires && !values[info.requires] ? MODULE_INFO[info.requires].label : null
          return (
            <li key={key}>
              <label htmlFor={`module-${key}`} className="flex items-start gap-3 p-4 text-sm">
                <Switch
                  id={`module-${key}`}
                  checked={values[key] && !blockedBy}
                  disabled={Boolean(blockedBy)}
                  onCheckedChange={(checked) => setValues((current) => ({ ...current, [key]: checked }))}
                />
                <input type="hidden" name={key} value={String(values[key])} />
                <span>
                  <span className="block font-medium">{info.label}</span>
                  <span className="text-muted-foreground">{blockedBy ? `Requires ${blockedBy}.` : info.description}</span>
                </span>
              </label>
            </li>
          )
        })}
      </ul>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving…">Save modules</SubmitButton>
      </div>
    </form>
  )
}
