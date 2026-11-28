import "server-only"
import { and, desc, eq, or, sql } from "drizzle-orm"
import type { PullRequestState } from "@/config/domain"
import { type CardReference, findCardReferences } from "@/lib/card-references"
import { db } from "@/server/db"
import { githubRepositories, projectRepositories, projects, taskGithubLinks, tasks } from "@/server/db/schema"

const MAX_REFERENCES = 50
const DEVELOPMENT_LIMIT = 30

interface RepositoryRef {
  id: number
}

export interface PushEvent {
  repository: RepositoryRef
  deleted?: boolean
  commits?: {
    id: string
    message: string
    url: string
    timestamp: string
    author?: { username?: string | null; name?: string | null }
  }[]
}

export interface PullRequestEvent {
  action: string
  repository: RepositoryRef
  pull_request: {
    number: number
    title: string
    body: string | null
    html_url: string
    state: "open" | "closed"
    draft?: boolean
    merged?: boolean
    merged_at?: string | null
    created_at: string
    user?: { login: string } | null
    head?: { ref: string }
  }
}

type LinkRow = typeof taskGithubLinks.$inferInsert

async function trackedRepositoryId(githubId: number): Promise<string | null> {
  const [repository] = await db.select({ id: githubRepositories.id }).from(githubRepositories).where(eq(githubRepositories.githubId, githubId)).limit(1)
  return repository?.id ?? null
}

/*
 * Only cards in projects that have this repository linked are matched, so a
 * repository cannot attach activity to unrelated projects that happen to share
 * a reference.
 */
async function resolveCards(repositoryId: string, references: CardReference[]): Promise<Map<string, string>> {
  const wanted = references.slice(0, MAX_REFERENCES)
  if (wanted.length === 0) return new Map()
  const rows = await db
    .select({ id: tasks.id, code: projects.code, number: tasks.number })
    .from(tasks)
    .innerJoin(projects, eq(projects.id, tasks.projectId))
    .innerJoin(projectRepositories, and(eq(projectRepositories.projectId, projects.id), eq(projectRepositories.repositoryId, repositoryId)))
    .where(or(...wanted.map((reference) => and(eq(projects.code, reference.code), eq(tasks.number, reference.number)))))
  return new Map(rows.map((row) => [`${row.code}-${row.number}`, row.id]))
}

function cardsFor(references: CardReference[], cards: Map<string, string>): string[] {
  return references.flatMap((reference) => cards.get(`${reference.code}-${reference.number}`) ?? [])
}

async function saveLinks(rows: LinkRow[]): Promise<void> {
  if (rows.length === 0) return
  await db
    .insert(taskGithubLinks)
    .values(rows)
    .onConflictDoUpdate({
      target: [taskGithubLinks.taskId, taskGithubLinks.repositoryId, taskGithubLinks.kind, taskGithubLinks.externalId],
      set: { title: sql`excluded.title`, url: sql`excluded.url`, state: sql`excluded.state`, updatedAt: new Date() },
    })
}

export async function recordPush(event: PushEvent): Promise<number> {
  const commits = event.commits ?? []
  if (event.deleted || commits.length === 0) return 0
  const repositoryId = await trackedRepositoryId(event.repository.id)
  if (!repositoryId) return 0

  const referenced = commits.map((commit) => ({ commit, references: findCardReferences(commit.message) }))
  const cards = await resolveCards(
    repositoryId,
    referenced.flatMap((entry) => entry.references),
  )
  const rows = referenced.flatMap(({ commit, references }) =>
    cardsFor(references, cards).map(
      (taskId): LinkRow => ({
        taskId,
        repositoryId,
        kind: "commit",
        externalId: commit.id,
        title: commit.message.split("\n")[0].slice(0, 300),
        url: commit.url,
        authorLogin: commit.author?.username ?? commit.author?.name ?? null,
        state: null,
        occurredAt: new Date(commit.timestamp),
      }),
    ),
  )
  await saveLinks(rows)
  return rows.length
}

function pullRequestState(pullRequest: PullRequestEvent["pull_request"]): PullRequestState {
  if (pullRequest.merged || pullRequest.merged_at) return "merged"
  if (pullRequest.state === "closed") return "closed"
  return pullRequest.draft ? "draft" : "open"
}

export async function recordPullRequest(event: PullRequestEvent): Promise<number> {
  const repositoryId = await trackedRepositoryId(event.repository.id)
  if (!repositoryId) return 0
  const pullRequest = event.pull_request
  const externalId = String(pullRequest.number)
  const state = pullRequestState(pullRequest)
  const title = pullRequest.title.slice(0, 300)

  await db
    .update(taskGithubLinks)
    .set({ state, title, updatedAt: new Date() })
    .where(and(eq(taskGithubLinks.repositoryId, repositoryId), eq(taskGithubLinks.kind, "pull_request"), eq(taskGithubLinks.externalId, externalId)))

  const references = findCardReferences(pullRequest.title, pullRequest.head?.ref, pullRequest.body)
  const cards = await resolveCards(repositoryId, references)
  const rows = cardsFor(references, cards).map(
    (taskId): LinkRow => ({
      taskId,
      repositoryId,
      kind: "pull_request",
      externalId,
      title,
      url: pullRequest.html_url,
      authorLogin: pullRequest.user?.login ?? null,
      state,
      occurredAt: new Date(pullRequest.created_at),
    }),
  )
  await saveLinks(rows)
  return rows.length
}

export async function taskDevelopment(taskId: string) {
  return db
    .select({
      id: taskGithubLinks.id,
      kind: taskGithubLinks.kind,
      externalId: taskGithubLinks.externalId,
      title: taskGithubLinks.title,
      url: taskGithubLinks.url,
      authorLogin: taskGithubLinks.authorLogin,
      state: taskGithubLinks.state,
      occurredAt: taskGithubLinks.occurredAt,
      repository: githubRepositories.fullName,
    })
    .from(taskGithubLinks)
    .innerJoin(githubRepositories, eq(githubRepositories.id, taskGithubLinks.repositoryId))
    .where(eq(taskGithubLinks.taskId, taskId))
    .orderBy(desc(taskGithubLinks.occurredAt))
    .limit(DEVELOPMENT_LIMIT)
}

export type TaskDevelopment = Awaited<ReturnType<typeof taskDevelopment>>
