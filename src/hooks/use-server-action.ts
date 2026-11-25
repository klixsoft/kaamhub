"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import type { ActionResult } from "@/types/action"

export function useServerAction() {
  const [isPending, startTransition] = useTransition()

  function run<TData>(execute: () => Promise<ActionResult<TData>>, successMessage?: string, onSuccess?: (data: TData) => void) {
    startTransition(async () => {
      const result = await execute()
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      if (successMessage) toast.success(successMessage)
      onSuccess?.(result.data)
    })
  }

  return { isPending, run }
}
