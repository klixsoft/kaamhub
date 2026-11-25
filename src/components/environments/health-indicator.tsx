import type { EnvironmentHealth } from "@/config/domain"
import { cn } from "@/lib/utils"

interface HealthIndicatorProps {
  environment: { health: EnvironmentHealth; lastStatusCode: number | null; lastResponseMs: number | null; url: string | null }
}

const LABEL: Record<EnvironmentHealth, string> = { up: "Up", down: "Down", unknown: "Not checked" }
const DOT: Record<EnvironmentHealth, string> = { up: "bg-emerald-500", down: "bg-red-500", unknown: "bg-zinc-400" }

export function HealthIndicator({ environment }: HealthIndicatorProps) {
  if (!environment.url) return <span className="text-xs text-muted-foreground">No URL</span>
  const detail = [environment.lastStatusCode ? `HTTP ${environment.lastStatusCode}` : null, environment.lastResponseMs ? `${environment.lastResponseMs} ms` : null]
    .filter(Boolean)
    .join(" · ")
  return (
    <span className={cn("flex shrink-0 flex-col items-end text-xs", environment.health === "down" && "text-destructive")}>
      <span className="flex items-center gap-1.5 font-medium">
        <span aria-hidden className={cn("size-2 rounded-full", DOT[environment.health])} />
        {LABEL[environment.health]}
      </span>
      {detail ? <span className="text-muted-foreground">{detail}</span> : null}
    </span>
  )
}
