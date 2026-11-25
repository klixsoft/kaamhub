import "server-only"
import { and, asc, eq, sql } from "drizzle-orm"
import type { Priority, TaskType, TaskVisibility } from "@/config/domain"
import { db } from "@/server/db"
import { boardColumns, taskAssignees, tasks, users } from "@/server/db/schema"
import type { ProjectAccess } from "./access"

export interface BoardAssignee {
  id: string
  name: string
  image: string | null
}

export interface BoardTask {
  id: string
  number: number
  title: string
  description: string | null
  type: TaskType
  priority: Priority
  visibility: TaskVisibility
  columnId: string
  position: number
  dueDate: string | null
  estimateHours: string | null
  assignees: BoardAssignee[]
}

export interface BoardColumn {
  id: string
  name: string
  isDone: boolean
}

export async function getBoard(access: ProjectAccess): Promise<{ columns: BoardColumn[]; tasks: BoardTask[] }> {
  const assignees = db
    .select({
      taskId: taskAssignees.taskId,
      list: sql<BoardAssignee[]>`json_agg(json_build_object('id', ${users.id}, 'name', ${users.name}, 'image', ${users.image}) order by ${users.name})`.as(
        "list",
      ),
    })
    .from(taskAssignees)
    .innerJoin(users, eq(users.id, taskAssignees.userId))
    .groupBy(taskAssignees.taskId)
    .as("assignees")

  const [columns, rows] = await Promise.all([
    db
      .select({ id: boardColumns.id, name: boardColumns.name, isDone: boardColumns.isDone })
      .from(boardColumns)
      .where(eq(boardColumns.projectId, access.projectId))
      .orderBy(asc(boardColumns.position)),
    db
      .select({
        id: tasks.id,
        number: tasks.number,
        title: tasks.title,
        description: tasks.description,
        type: tasks.type,
        priority: tasks.priority,
        visibility: tasks.visibility,
        columnId: tasks.columnId,
        position: tasks.position,
        dueDate: tasks.dueDate,
        estimateHours: tasks.estimateHours,
        assignees: sql<BoardAssignee[]>`coalesce(${assignees.list}, '[]'::json)`,
      })
      .from(tasks)
      .leftJoin(assignees, eq(assignees.taskId, tasks.id))
      .where(and(eq(tasks.projectId, access.projectId), access.isClientViewer ? eq(tasks.visibility, "client") : undefined))
      .orderBy(asc(tasks.position)),
  ])

  return { columns, tasks: rows }
}
