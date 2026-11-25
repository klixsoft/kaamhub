"use client"

import { useCallback, useEffect, useState } from "react"
import type { TaskDetail } from "@/server/modules/tasks/queries"

type State = { status: "loading" } | { status: "error" } | { status: "ready"; detail: TaskDetail }

export function useTaskDetail(taskId: string) {
  const [state, setState] = useState<State>({ status: "loading" })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/tasks/${taskId}`, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        setState({ status: "ready", detail: (await response.json()) as TaskDetail })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: "error" })
      })
    return () => controller.abort()
  }, [taskId, version])

  const refresh = useCallback(() => setVersion((current) => current + 1), [])
  return { state, refresh }
}
