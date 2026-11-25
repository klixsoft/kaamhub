import "server-only"
import { notFound } from "next/navigation"
import { cache } from "react"
import { requireUser } from "@/server/auth/session"
import { isUuid } from "@/server/lib/query"
import { resolveProjectAccess } from "./access"
import { getProjectSummary } from "./queries"

export const loadProjectContext = cache(async (projectId: string) => {
  const user = await requireUser()
  if (!isUuid(projectId)) notFound()
  const access = await resolveProjectAccess(user, projectId)
  if (!access) notFound()
  const project = await getProjectSummary(projectId)
  if (!project) notFound()
  return { user, access, project }
})
