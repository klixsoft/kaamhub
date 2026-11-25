"use client"

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable"
import { useSearchParams } from "next/navigation"
import { useCallback, useId, useMemo, useState, useTransition } from "react"
import { toast } from "sonner"
import type { BoardColumn as Column, BoardTask } from "@/server/modules/projects/board"
import { moveTask } from "@/server/modules/projects/task-actions"
import { BoardColumn } from "./board-column"
import { TaskCardContent } from "./task-card"
import { TaskDialog, type TaskDialogState } from "./task-dialog"

interface KanbanBoardProps {
  projectId: string
  projectCode: string
  columns: Column[]
  tasks: BoardTask[]
  canEdit: boolean
}

type Lanes = Record<string, BoardTask[]>

function toLanes(columns: Column[], tasks: BoardTask[]): Lanes {
  const lanes: Lanes = Object.fromEntries(columns.map((column) => [column.id, []]))
  for (const task of tasks) lanes[task.columnId]?.push(task)
  return lanes
}

function syncTaskParam(number: number | null) {
  const url = new URL(window.location.href)
  if (number === null) url.searchParams.delete("task")
  else url.searchParams.set("task", String(number))
  window.history.replaceState(window.history.state, "", url)
}

function findLane(lanes: Lanes, id: string): string | undefined {
  if (id in lanes) return id
  return Object.keys(lanes).find((columnId) => lanes[columnId]?.some((task) => task.id === id))
}

export function KanbanBoard({ projectId, projectCode, columns, tasks, canEdit }: KanbanBoardProps) {
  const serverLanes = useMemo(() => toLanes(columns, tasks), [columns, tasks])
  const [lanes, setLanes] = useState(serverLanes)
  const [syncedLanes, setSyncedLanes] = useState(serverLanes)
  const [activeTask, setActiveTask] = useState<BoardTask | null>(null)
  const searchParams = useSearchParams()
  const [dialog, setDialog] = useState<TaskDialogState>(() => {
    const number = Number(searchParams.get("task"))
    const linked = Number.isInteger(number) ? tasks.find((task) => task.number === number) : undefined
    return linked ? { mode: "view", task: linked } : null
  })
  const [, startTransition] = useTransition()
  const dndId = useId()

  if (syncedLanes !== serverLanes) {
    setSyncedLanes(serverLanes)
    setLanes(serverLanes)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveTask(Object.values(lanes).flat().find((task) => task.id === active.id) ?? null)
  }

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return
    setLanes((current) => {
      const from = findLane(current, String(active.id))
      const to = findLane(current, String(over.id))
      if (!from || !to || from === to) return current
      const moving = current[from]?.find((task) => task.id === active.id)
      if (!moving) return current
      const target = current[to] ?? []
      const overIndex = target.findIndex((task) => task.id === over.id)
      const insertAt = overIndex >= 0 ? overIndex : target.length
      return {
        ...current,
        [from]: (current[from] ?? []).filter((task) => task.id !== active.id),
        [to]: [...target.slice(0, insertAt), { ...moving, columnId: to }, ...target.slice(insertAt)],
      }
    })
  }

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveTask(null)
    if (!over) return setLanes(serverLanes)

    const columnId = findLane(lanes, String(active.id))
    if (!columnId) return
    const lane = lanes[columnId] ?? []
    const oldIndex = lane.findIndex((task) => task.id === active.id)
    const overIndex = lane.findIndex((task) => task.id === over.id)
    const ordered = overIndex >= 0 && overIndex !== oldIndex ? arrayMove(lane, oldIndex, overIndex) : lane
    const index = ordered.findIndex((task) => task.id === active.id)
    const original = tasks.find((task) => task.id === active.id)

    const unchanged = original?.columnId === columnId && ordered === lane && overIndex === oldIndex
    if (unchanged) return

    const nextLanes = { ...lanes, [columnId]: ordered }
    setLanes(nextLanes)
    startTransition(async () => {
      const result = await moveTask({
        taskId: String(active.id),
        columnId,
        beforeTaskId: ordered[index - 1]?.id ?? null,
        afterTaskId: ordered[index + 1]?.id ?? null,
      })
      if (!result.ok) {
        toast.error(result.error)
        setLanes(serverLanes)
      }
    })
  }

  const openTask = useCallback((task: BoardTask) => {
    setDialog({ mode: "view", task })
    syncTaskParam(task.number)
  }, [])
  const addTask = useCallback((columnId: string) => setDialog({ mode: "create", columnId }), [])
  const closeDialog = useCallback(() => {
    setDialog(null)
    syncTaskParam(null)
  }, [])

  return (
    <>
      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
        onDragCancel={() => {
          setActiveTask(null)
          setLanes(serverLanes)
        }}
      >
        <div className="-mx-4 flex min-h-0 flex-1 gap-4 overflow-x-auto px-4 pb-2 md:-mx-6 md:px-6">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              tasks={lanes[column.id] ?? []}
              projectCode={projectCode}
              canEdit={canEdit}
              onOpenTask={openTask}
              onAddTask={addTask}
            />
          ))}
        </div>
        <DragOverlay>{activeTask ? <TaskCardContent task={activeTask} projectCode={projectCode} onOpen={() => {}} overlay /> : null}</DragOverlay>
      </DndContext>
      <TaskDialog
        state={dialog}
        onClose={closeDialog}
        projectId={projectId}
        projectCode={projectCode}
        columns={columns}
      />
    </>
  )
}
