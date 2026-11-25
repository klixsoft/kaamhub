"use client"

import { useEffect, useSyncExternalStore } from "react"

let activeCount = 0
let sidebarHydrated = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useFocusMode(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => sidebarHydrated && activeCount > 0,
    () => false,
  )
}

export function FocusMode() {
  useEffect(() => {
    activeCount++
    notify()
    return () => {
      activeCount--
      notify()
    }
  }, [])
  return null
}

export function SidebarHydrated() {
  useEffect(() => {
    sidebarHydrated = true
    notify()
  }, [])
  return null
}
