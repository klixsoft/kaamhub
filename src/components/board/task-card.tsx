"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { BugIcon, CalendarIcon, CheckSquareIcon, EyeIcon, MessageSquareIcon } from "lucide-react"
import { PriorityBadge } from "@/components/projects/badges"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TASK_TYPE_LABELS } from "@/config/domain"
import { formatDate, initials } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { BoardTask } from "@/server/modules/projects/board"

interface TaskCardProps {
  task: BoardTask
  projectCode: string
  onOpen: (task: BoardTask) => void
  overlay?: boolean
}

export function TaskCardContent({ task, projectCode, onOpen, overlay }: TaskCardProps) {
  const overdue = task.dueDate !== null && task.dueDate < new Date().toISOString().slice(0, 10)
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border bg-card p-3 text-sm shadow-xs", overlay && "rotate-1 shadow-lg")}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="font-mono">
          {projectCode}-{task.number}
        </span>
        <span className="flex items-center gap-1.5">
          {task.visibility === "client" ? <EyeIcon className="size-3.5" aria-label="Visible to client" /> : null}
          {task.type === "bug" ? <BugIcon className="size-3.5 text-destructive" aria-hidden /> : null}
          <span>{TASK_TYPE_LABELS[task.type]}</span>
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpen(task)}
        className="text-left font-medium leading-snug outline-none hover:underline focus-visible:underline"
      >
        {task.title}
      </button>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <PriorityBadge priority={task.priority} />
          {task.commentCount > 0 ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground" aria-label={`${task.commentCount} comments`}>
              <MessageSquareIcon className="size-3" aria-hidden />
              {task.commentCount}
            </span>
          ) : null}
          {task.checklistTotal > 0 ? (
            <span
              className={cn("flex items-center gap-1 text-xs", task.checklistDone === task.checklistTotal ? "text-emerald-600" : "text-muted-foreground")}
              aria-label={`Checklist ${task.checklistDone} of ${task.checklistTotal} done`}
            >
              <CheckSquareIcon className="size-3" aria-hidden />
              {task.checklistDone}/{task.checklistTotal}
            </span>
          ) : null}
          {task.dueDate ? (
            <span className={cn("flex items-center gap-1 text-xs", overdue ? "text-destructive" : "text-muted-foreground")}>
              <CalendarIcon className="size-3" aria-hidden />
              <span className="sr-only">{overdue ? "Overdue, due" : "Due"}</span>
              {formatDate(task.dueDate)}
            </span>
          ) : null}
        </div>
        {task.assignees.length > 0 ? (
          <div className="flex -space-x-1.5" aria-label={`Assigned to ${task.assignees.map((assignee) => assignee.name).join(", ")}`}>
            {task.assignees.slice(0, 3).map((assignee) => (
              <Avatar key={assignee.id} className="size-6 ring-2 ring-card">
                {assignee.image ? <AvatarImage src={assignee.image} alt="" /> : null}
                <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
              </Avatar>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function SortableTaskCard({ task, projectCode, onOpen, disabled }: TaskCardProps & { disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { columnId: task.columnId },
    disabled,
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn("list-none", isDragging && "opacity-40", !disabled && "cursor-grab active:cursor-grabbing")}
      {...attributes}
      {...listeners}
      aria-roledescription={disabled ? undefined : "Draggable task"}
    >
      <TaskCardContent task={task} projectCode={projectCode} onOpen={onOpen} />
    </li>
  )
}
