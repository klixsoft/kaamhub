"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
      <h1 className="text-xl font-semibold">We couldn’t load this page</h1>
      <p className="max-w-sm text-sm text-muted-foreground">Please try again in a moment.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
