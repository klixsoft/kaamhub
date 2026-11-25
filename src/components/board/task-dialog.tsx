"use client"

import { Trash2Icon } from "lucide-react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { PriorityBadge } from "@/components/projects/badges"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TASK_TYPE_LABELS } from "@/config/domain"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDate } from "@/lib/format"
import type { BoardColumn, BoardTask } from "@/server/modules/projects/board"
import { deleteTask } from "@/server/modules/projects/task-actions"
import { TaskForm } from "./task-form"

export type TaskDialogState = { mode: "create"; columnId: string } | { mode: "edit"; task: BoardTask } | null

interface TaskDialogProps {
  state: TaskDialogState
  onClose: () => void
  projectId: string
  projectCode: string
  columns: BoardColumn[]
  canEdit: boolean
}

function TaskReadOnly({ task, columns }: { task: BoardTask; columns: BoardColumn[] }) {
  return (
    <dl className="grid gap-4 text-sm sm:grid-cols-2">
      <div className="sm:col-span-2">
        <dt className="sr-only">Description</dt>
        <dd className="whitespace-pre-wrap text-muted-foreground">{task.description || "No description."}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Status</dt>
        <dd>{columns.find((column) => column.id === task.columnId)?.name}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Priority</dt>
        <dd>
          <PriorityBadge priority={task.priority} />
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Due date</dt>
        <dd>{formatDate(task.dueDate)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Assignees</dt>
        <dd>{task.assignees.map((assignee) => assignee.name).join(", ") || "—"}</dd>
      </div>
    </dl>
  )
}

export function TaskDialog({ state, onClose, projectId, projectCode, columns, canEdit }: TaskDialogProps) {
  const { isPending, run } = useServerAction()
  const task = state?.mode === "edit" ? state.task : undefined

  return (
    <Dialog open={state !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{task ? task.title : "New task"}</DialogTitle>
          <DialogDescription>
            {task ? `${projectCode}-${task.number} · ${TASK_TYPE_LABELS[task.type]}` : "Add a task to the board."}
          </DialogDescription>
        </DialogHeader>
        {state && canEdit ? (
          <TaskForm
            key={task?.id ?? "new"}
            projectId={projectId}
            columns={columns}
            task={task}
            defaultColumnId={state.mode === "create" ? state.columnId : (task?.columnId ?? columns[0]?.id ?? "")}
            onSaved={onClose}
          />
        ) : null}
        {task && !canEdit ? <TaskReadOnly task={task} columns={columns} /> : null}
        {task && canEdit ? (
          <div className="border-t pt-4">
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-destructive" disabled={isPending}>
                  <Trash2Icon aria-hidden />
                  Delete task
                </Button>
              }
              title="Delete this task?"
              description="The task and its assignments will be permanently removed."
              confirmLabel="Delete"
              destructive
              onConfirm={() => run(() => deleteTask({ taskId: task.id }), "Task deleted", onClose)}
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
