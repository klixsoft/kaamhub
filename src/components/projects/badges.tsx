import { Badge } from "@/components/ui/badge"
import { PRIORITY_LABELS, type Priority, PROJECT_STATUS_LABELS, type ProjectStatus } from "@/config/domain"
import { cn } from "@/lib/utils"

const STATUS_DOT: Record<ProjectStatus, string> = {
  planning: "bg-sky-500",
  in_progress: "bg-amber-500",
  on_hold: "bg-zinc-400",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge variant="outline">
      <span aria-hidden className={cn("size-1.5 rounded-full", STATUS_DOT[status])} />
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge variant={priority === "urgent" ? "destructive" : priority === "high" ? "secondary" : "outline"}>{PRIORITY_LABELS[priority]}</Badge>
  )
}

export function ProjectStageBadge({ stage }: { stage: string }) {
  return <Badge variant="secondary">{stage}</Badge>
}
