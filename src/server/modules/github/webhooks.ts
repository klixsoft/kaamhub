import "server-only"
import { logger } from "@/server/lib/logger"
import { type GithubRepositoryPayload, removeRepository, syncRepositories, upsertRepositories } from "./repositories"

interface RepositoryEvent {
  action: string
  repository: GithubRepositoryPayload
}

const REPOSITORY_UPDATES = new Set(["created", "edited", "renamed", "archived", "unarchived", "publicized", "privatized", "transferred"])

export async function handleGithubEvent(event: string, payload: unknown): Promise<void> {
  if (event === "repository") {
    const { action, repository } = payload as RepositoryEvent
    if (action === "deleted") await removeRepository(repository.id)
    else if (REPOSITORY_UPDATES.has(action)) await upsertRepositories([repository])
    return
  }
  if (event === "installation_repositories" || event === "installation") {
    await syncRepositories()
    return
  }
  logger.debug("Ignored GitHub webhook event", { event })
}
