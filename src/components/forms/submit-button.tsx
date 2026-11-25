"use client"

import { Loader2Icon } from "lucide-react"
import type { ComponentProps } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & { pending?: boolean; pendingLabel?: string }

export function SubmitButton({ children, pending, pendingLabel, disabled, ...props }: SubmitButtonProps) {
  const status = useFormStatus()
  const isPending = pending ?? status.pending
  return (
    <Button type="submit" disabled={disabled || isPending} aria-busy={isPending} {...props}>
      {isPending ? <Loader2Icon className="animate-spin" aria-hidden /> : null}
      {isPending && pendingLabel ? pendingLabel : children}
    </Button>
  )
}
