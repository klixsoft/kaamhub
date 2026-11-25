import { CircleAlertIcon } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { ActionState } from "@/types/action"

export function FormAlert({ state }: { state: ActionState<unknown> }) {
  if (!state || state.ok) return null
  return (
    <Alert variant="destructive" role="alert">
      <CircleAlertIcon aria-hidden />
      <AlertDescription>{state.error}</AlertDescription>
    </Alert>
  )
}
