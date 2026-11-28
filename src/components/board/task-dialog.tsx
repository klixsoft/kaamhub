"use client"

import { AlignLeftIcon, MessageSquareIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { PriorityBadge } from "@/components/projects/badges"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { TASK_TYPE_LABELS, TASK_VISIBILITY_LABELS } from "@/config/domain"
import { useServerAction } from "@/hooks/use-server-action"
import { todayIso } from "@/lib/dates"
import { formatDate, formatDateTime, initials } from "@/lib/format"
import type { BoardColumn, BoardTask } from "@/server/modules/projects/board"
import { deleteTask } from "@/server/modules/projects/task-actions"
import type { TaskDetail } from "@/server/modules/tasks/queries"
import { TaskForm } from "./task-form"
import { ActivityFeed } from "./task-detail/activity-feed"
import { Attachments } from "./task-detail/attachments"
import { TimeSection } from "./task-detail/time-section"
import { Checklist } from "./task-detail/checklist"
import { CommentComposer } from "./task-detail/comment-composer"
import { useTaskDetail } from "./task-detail/use-task-detail"

export type TaskDialogState = { mode: "create"; columnId: string } | { mode: "view"; task: BoardTask } | null

interface TaskDialogProps {
  state: TaskDialogState
  onClose: () => void
  projectId: string
  projectCode: string
  columns: BoardColumn[]
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

function Properties({ detail }: { detail: TaskDetail }) {
  const { task } = detail
  return (
    <dl className="flex flex-col gap-4">
      <Property label="Status">{task.columnName}</Property>
      <Property label="Assignees">
        {task.assignees.length === 0 ? (
          <span className="text-muted-foreground">Nobody</span>
        ) : (
          <ul className="flex flex-col gap-2">
            {task.assignees.map((assignee) => (
              <li key={assignee.id} className="flex items-center gap-2">
                <Avatar className="size-6">
                  {assignee.image ? <AvatarImage src={assignee.image} alt="" /> : null}
                  <AvatarFallback className="text-[10px]">{initials(assignee.name)}</AvatarFallback>
                </Avatar>
                {assignee.name}
              </li>
            ))}
          </ul>
        )}
      </Property>
      <Property label="Priority">
        <PriorityBadge priority={task.priority} />
      </Property>
      <Property label="Type">{TASK_TYPE_LABELS[task.type]}</Property>
      <Property label="Due date">{formatDate(task.dueDate)}</Property>
      {task.estimateHours ? <Property label="Estimate">{task.estimateHours} h</Property> : null}
      {detail.permissions.isClientViewer ? null : <Property label="Visibility">{TASK_VISIBILITY_LABELS[task.visibility]}</Property>}
      {task.requestedBy ? <Property label="Requested by">{task.requestedBy} (client)</Property> : null}
      <Property label="Created">{formatDateTime(task.createdAt)}</Property>
    </dl>
  )
}

interface TaskViewProps {
  boardTask: BoardTask
  projectId: string
  projectCode: string
  columns: BoardColumn[]
  onClose: () => void
}

function TaskView({ boardTask, projectId, projectCode, columns, onClose }: TaskViewProps) {
  const { state, refresh } = useTaskDetail(boardTask.id)
  const { isPending, run } = useServerAction()
  const [editing, setEditing] = useState(false)

  if (state.status === "error") {
    return <p className="text-sm text-destructive">We couldn’t load this card. Please try again in a moment.</p>
  }
  if (state.status === "loading") {
    return (
      <div className="grid gap-6 md:grid-cols-[1fr_14rem]" aria-busy="true">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const { detail } = state
  const { task, permissions } = detail

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_14rem]">
      <div className="flex min-w-0 flex-col gap-6">
        {editing ? (
          <TaskForm
            projectId={projectId}
            columns={columns}
            task={boardTask}
            defaultColumnId={boardTask.columnId}
            onSaved={() => {
              setEditing(false)
              refresh()
            }}
          />
        ) : (
          <section aria-labelledby="description-heading" className="flex flex-col gap-2">
            <h3 id="description-heading" className="flex items-center gap-2 text-sm font-semibold">
              <AlignLeftIcon className="size-4" aria-hidden />
              Description
            </h3>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">{task.description || "No description."}</p>
          </section>
        )}

        <Checklist taskId={task.id} items={detail.checklist} canEdit={permissions.canEdit} onChange={refresh} />

        <Attachments
          taskId={task.id}
          attachments={detail.attachments}
          canUpload={permissions.canComment}
          allowClientVisibility={task.visibility === "client"}
          isClientViewer={permissions.isClientViewer}
          onChange={refresh}
        />

        {detail.time ? (
          <TimeSection
            taskId={task.id}
            projectId={projectId}
            time={detail.time}
            estimateHours={task.estimateHours}
            canLog={permissions.canEdit}
            today={todayIso()}
            onChange={refresh}
          />
        ) : null}

        <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
          <h3 id="activity-heading" className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquareIcon className="size-4" aria-hidden />
            Activity
          </h3>
          {permissions.canComment ? (
            <CommentComposer
              taskId={task.id}
              projectId={projectId}
              allowClientVisibility={task.visibility === "client"}
              isClientViewer={permissions.isClientViewer}
              onPosted={refresh}
            />
          ) : null}
          <ActivityFeed detail={detail} onChange={refresh} />
        </section>
      </div>

      <aside className="flex flex-col gap-4 md:border-l md:pl-6">
        <Properties detail={detail} />
        {permissions.canEdit ? (
          <div className="flex flex-col gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setEditing((current) => !current)}>
              <PencilIcon aria-hidden />
              {editing ? "Stop editing" : "Edit details"}
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="text-destructive" disabled={isPending}>
                  <Trash2Icon aria-hidden />
                  Delete card
                </Button>
              }
              title="Delete this card?"
              description={`${projectCode}-${task.number} and its comments, checklist and history are permanently removed.`}
              confirmLabel="Delete"
              destructive
              onConfirm={() => run(() => deleteTask({ taskId: task.id }), "Card deleted", onClose)}
            />
          </div>
        ) : null}
      </aside>
    </div>
  )
}

export function TaskDialog({ state, onClose, projectId, projectCode, columns }: TaskDialogProps) {
  const task = state?.mode === "view" ? state.task : undefined

  return (
    <Dialog open={state !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className={task ? "max-h-[92svh] overflow-y-auto sm:max-w-4xl" : "max-h-[90svh] overflow-y-auto sm:max-w-2xl"}>
        <DialogHeader>
          <DialogDescription className="font-mono">{task ? `${projectCode}-${task.number} · ${TASK_TYPE_LABELS[task.type]}` : "New card"}</DialogDescription>
          <DialogTitle className="text-lg">{task ? task.title : "Add a card"}</DialogTitle>
        </DialogHeader>
        {state?.mode === "create" ? (
          <TaskForm projectId={projectId} columns={columns} defaultColumnId={state.columnId} onSaved={onClose} />
        ) : null}
        {task ? <TaskView key={task.id} boardTask={task} projectId={projectId} projectCode={projectCode} columns={columns} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}
