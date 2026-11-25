"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useTransition } from "react"
import { LIST_PARAM_KEYS } from "@/lib/list-params"

type ParamPatch = Record<string, string | number | null | undefined>

export function useListState() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const setParams = useCallback(
    (patch: ParamPatch, options: { resetPage?: boolean } = { resetPage: true }) => {
      const next = new URLSearchParams(searchParams.toString())
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === undefined || value === "") next.delete(key)
        else next.set(key, String(value))
      }
      if (options.resetPage) next.delete(LIST_PARAM_KEYS.page)
      const query = next.toString()
      startTransition(() => router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false }))
    },
    [pathname, router, searchParams],
  )

  const getValues = useCallback(
    (key: string): string[] => searchParams.get(key)?.split(",").filter(Boolean) ?? [],
    [searchParams],
  )

  return { searchParams, setParams, getValues, isPending }
}
