"use client"

import { useEffect, useState } from "react"
import type { Option, OptionParams, OptionResource } from "@/lib/options"
import { useDebouncedValue } from "./use-debounced-value"

interface AsyncOptionsState {
  options: Option[]
  isLoading: boolean
  error: boolean
}

interface FetchResult {
  key: string
  options: Option[]
  error: boolean
}

export function useAsyncOptions(
  resource: OptionResource | undefined,
  params: OptionParams | undefined,
  query: string,
  enabled: boolean,
): AsyncOptionsState {
  const debouncedQuery = useDebouncedValue(query, 250)
  const paramsKey = new URLSearchParams(params).toString()
  const requestKey = `${resource ?? ""}?${paramsKey}&q=${debouncedQuery}`
  const [result, setResult] = useState<FetchResult>({ key: "", options: [], error: false })

  useEffect(() => {
    if (!resource || !enabled) return
    const controller = new AbortController()
    const search = new URLSearchParams(paramsKey)
    search.set("q", debouncedQuery)

    fetch(`/api/options/${resource}?${search.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Request failed with ${response.status}`)
        const body = (await response.json()) as { items: Option[] }
        setResult({ key: requestKey, options: body.items, error: false })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.error("Failed to load options", error)
        setResult({ key: requestKey, options: [], error: true })
      })

    return () => controller.abort()
  }, [resource, paramsKey, debouncedQuery, enabled, requestKey])

  return {
    options: result.options,
    isLoading: Boolean(resource) && enabled && result.key !== requestKey,
    error: result.error,
  }
}
