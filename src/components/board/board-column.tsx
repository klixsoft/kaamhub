"use client"

import { useDroppable } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BoardColumn as Column, BoardTask } from "@/server/modules/projects/board"
import { SortableTaskCard } from "./task-card"

interface BoardColumnProps {
  column: Column
  tasks: BoardTask[]
  projectCode: string
  canEdit: boolean
  onOpenTask: (task: BoardTask) => void
  onAddTask: (columnId: string) => void
}

export function BoardColumn({ column, tasks, projectCode, canEdit, onOpenTask, onAddTask }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { columnId: column.id }, disabled: !canEdit })

  return (
    <section
      aria-labelledby={`column-${column.id}`}
      className="flex w-72 shrink-0 flex-col rounded-xl bg-muted/50 md:w-80"
    >
      <header className="flex items-center justify-between gap-2 px-3 pt-3 pb-2">
        <h2 id={`column-${column.id}`} className="flex items-center gap-2 text-sm font-semibold">
          {column.name}
          <span className="rounded-full bg-background px-2 text-xs font-normal text-muted-foreground tabular-nums">{tasks.length}</span>
        </h2>
        {canEdit ? (
          <Button variant="ghost" size="icon-sm" onClick={() => onAddTask(column.id)} aria-label={`Add task to ${column.name}`}>
            <PlusIcon />
          </Button>
        ) : null}
      </header>
      <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={cn("flex min-h-24 flex-1 flex-col gap-2 rounded-b-xl p-2 transition-colors", isOver && "bg-primary/5")}
        >
          {tasks.map((task) => (
            <SortableTaskCard key={task.id} task={task} projectCode={projectCode} onOpen={onOpenTask} disabled={!canEdit} />
          ))}
          {tasks.length === 0 ? <li className="list-none p-3 text-center text-xs text-muted-foreground">No tasks</li> : null}
        </ul>
      </SortableContext>
    </section>
  )
}
