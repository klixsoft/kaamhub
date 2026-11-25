import "server-only"
import type { CurrentUser } from "@/server/auth/session"
import { forbiddenError, notFoundError } from "@/server/lib/errors"
import { type ProjectAccess, resolveProjectAccess } from "./access"

export type ProjectCapability = "view" | "editTasks" | "manage"

export async function requireProjectCapability(user: CurrentUser, projectId: string, capability: ProjectCapability): Promise<ProjectAccess> {
  const access = await resolveProjectAccess(user, projectId)
  if (!access) throw notFoundError("Project")
  if (capability === "editTasks" && !access.canEditTasks) throw forbiddenError()
  if (capability === "manage" && !access.canManage) throw forbiddenError()
  return access
}
