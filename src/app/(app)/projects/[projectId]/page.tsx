import type { Metadata } from "next"
import { Suspense } from "react"
import { KanbanBoard } from "@/components/board/kanban-board"
import { Skeleton } from "@/components/ui/skeleton"
import { getBoard } from "@/server/modules/projects/board"
import { loadProjectContext } from "@/server/modules/projects/context"

export const metadata: Metadata = { title: "Board" }

async function Board({ params }: { params: PageProps<"/projects/[projectId]">["params"] }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  const board = await getBoard(access)
  return (
    <KanbanBoard projectId={project.id} projectCode={project.code} columns={board.columns} tasks={board.tasks} canEdit={access.canEditTasks} />
  )
}

function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-96 w-72 shrink-0 rounded-xl md:w-80" />
      ))}
    </div>
  )
}

export default function ProjectBoardPage({ params }: PageProps<"/projects/[projectId]">) {
  return (
    <Suspense fallback={<BoardSkeleton />}>
      <Board params={params} />
    </Suspense>
  )
}
