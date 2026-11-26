import "server-only"
import { count, eq, max, notInArray, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { githubRepositories } from "@/server/db/schema"
import { getInstallationClient } from "./client"

interface GithubRepositoryPayload {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  archived?: boolean
  default_branch?: string
  html_url: string
  pushed_at?: string | null
  owner: { login: string }
}

function toRow(repo: GithubRepositoryPayload) {
  return {
    githubId: repo.id,
    owner: repo.owner.login,
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    isPrivate: repo.private,
    isArchived: repo.archived ?? false,
    defaultBranch: repo.default_branch ?? null,
    htmlUrl: repo.html_url,
    pushedAt: repo.pushed_at ? new Date(repo.pushed_at) : null,
  }
}

export async function upsertRepositories(repos: GithubRepositoryPayload[]): Promise<void> {
  if (repos.length === 0) return
  await db
    .insert(githubRepositories)
    .values(repos.map(toRow))
    .onConflictDoUpdate({
      target: githubRepositories.githubId,
      set: {
        owner: sql`excluded.owner`,
        name: sql`excluded.name`,
        fullName: sql`excluded.full_name`,
        description: sql`excluded.description`,
        isPrivate: sql`excluded.is_private`,
        isArchived: sql`excluded.is_archived`,
        defaultBranch: sql`excluded.default_branch`,
        htmlUrl: sql`excluded.html_url`,
        pushedAt: sql`excluded.pushed_at`,
        updatedAt: new Date(),
      },
    })
}

export async function syncRepositories(): Promise<{ count: number }> {
  const { octokit } = await getInstallationClient()
  const repos = (await octokit.paginate(octokit.rest.apps.listReposAccessibleToInstallation, { per_page: 100 })) as GithubRepositoryPayload[]

  await upsertRepositories(repos)
  if (repos.length > 0) {
    await db.delete(githubRepositories).where(notInArray(githubRepositories.githubId, repos.map((repo) => repo.id)))
  }
  return { count: repos.length }
}

export async function removeRepository(githubId: number): Promise<void> {
  await db.delete(githubRepositories).where(eq(githubRepositories.githubId, githubId))
}

export async function createOrganizationRepository(input: { name: string; description?: string | null; isPrivate: boolean }) {
  const { octokit, org } = await getInstallationClient()
  const { data } = await octokit.rest.repos.createInOrg({
    org,
    name: input.name,
    description: input.description ?? undefined,
    private: input.isPrivate,
    auto_init: true,
  })
  await upsertRepositories([data as GithubRepositoryPayload])
  const [row] = await db
    .select({ id: githubRepositories.id })
    .from(githubRepositories)
    .where(eq(githubRepositories.githubId, data.id))
    .limit(1)
  return row
}

export type { GithubRepositoryPayload }

export async function getRepositoryStats() {
  const [stats] = await db.select({ total: count(), lastSync: max(githubRepositories.updatedAt) }).from(githubRepositories)
  return { total: stats?.total ?? 0, lastSync: stats?.lastSync ?? null }
}
