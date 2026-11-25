import { ArrowLeftIcon } from "lucide-react"
import type { Metadata } from "next"
import Link from "next/link"
import { Suspense } from "react"
import { KanbanBoard } from "@/components/board/kanban-board"
import { FocusMode } from "@/components/layout/focus-mode"
import { ProjectStageBadge, ProjectStatusBadge } from "@/components/projects/badges"
import { Skeleton } from "@/components/ui/skeleton"
import { getBoard } from "@/server/modules/projects/board"
import { loadProjectContext } from "@/server/modules/projects/context"

export const metadata: Metadata = { title: "Board" }

async function Board({ params }: { params: PageProps<"/projects/[projectId]/board">["params"] }) {
  const { projectId } = await params
  const { access, project } = await loadProjectContext(projectId)
  const board = await getBoard(access)

  return (
    <>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={`/projects/${project.id}`}
          className="flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <ArrowLeftIcon className="size-4" aria-hidden />
          Project
        </Link>
        <h1 className="text-lg font-semibold tracking-tight">
          {project.name} <span className="font-mono text-sm font-normal text-muted-foreground">{project.code}</span>
        </h1>
        <ProjectStatusBadge status={project.status} />
        {project.stageName ? <ProjectStageBadge stage={project.stageName} /> : null}
      </header>
      <KanbanBoard projectId={project.id} projectCode={project.code} columns={board.columns} tasks={board.tasks} canEdit={access.canEditTasks} />
    </>
  )
}

function BoardSkeleton() {
  return (
    <div className="flex flex-1 gap-4 overflow-hidden" aria-busy="true">
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className="h-full w-72 shrink-0 rounded-xl md:w-80" />
      ))}
    </div>
  )
}

export default function ProjectBoardPage({ params }: PageProps<"/projects/[projectId]/board">) {
  return (
    <div className="flex h-[calc(100svh-3rem)] min-w-0 flex-col gap-4 p-4 md:px-6">
      <FocusMode />
      <Suspense fallback={<BoardSkeleton />}>
        <Board params={params} />
      </Suspense>
    </div>
  )
}
