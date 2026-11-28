import { randomInt } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { db } from "@/server/db"
import { boardColumns, githubRepositories, projectRepositories, projects, taskGithubLinks, tasks } from "@/server/db/schema"
import { recordPullRequest, recordPush, taskDevelopment } from "@/server/modules/github/card-links"

const githubId = randomInt(1_000_000_000, 2_000_000_000)
const otherGithubId = githubId + 1
const code = `T${randomInt(10_000, 99_999)}`
let projectId: string
let taskId: string
let repositoryId: string

function repository(id: number) {
  return { id }
}

beforeAll(async () => {
  const [project] = await db.insert(projects).values({ code, name: "Card links test" }).returning({ id: projects.id })
  projectId = project.id
  const [column] = await db.insert(boardColumns).values({ projectId, name: "To do", position: 0 }).returning({ id: boardColumns.id })
  const [task] = await db.insert(tasks).values({ projectId, columnId: column.id, number: 4, title: "Login", position: 1 }).returning({ id: tasks.id })
  taskId = task.id
  const repoRow = { owner: "acme", isPrivate: true, htmlUrl: "https://github.com/acme/app" }
  const [repo] = await db
    .insert(githubRepositories)
    .values([
      { ...repoRow, githubId, name: "app", fullName: `acme/app-${githubId}` },
      { ...repoRow, githubId: otherGithubId, name: "other", fullName: `acme/other-${githubId}` },
    ])
    .returning({ id: githubRepositories.id })
  repositoryId = repo.id
  await db.insert(projectRepositories).values({ projectId, repositoryId })
})

afterAll(async () => {
  await db.delete(projects).where(eq(projects.id, projectId))
  await db.delete(githubRepositories).where(eq(githubRepositories.githubId, githubId))
  await db.delete(githubRepositories).where(eq(githubRepositories.githubId, otherGithubId))
})

describe("GitHub card links", () => {
  it("links commits that mention the card and ignores repeats", async () => {
    const commit = {
      id: "a".repeat(40),
      message: `${code.toLowerCase()}-4: fix the login form\n\nLonger body`,
      url: "https://github.com/acme/app/commit/aaaa",
      timestamp: "2026-11-20T10:00:00Z",
      author: { username: "sita" },
    }
    expect(await recordPush({ repository: repository(githubId), commits: [commit, { ...commit, id: "b".repeat(40), message: "unrelated" }] })).toBe(1)
    await recordPush({ repository: repository(githubId), commits: [commit] })
    const links = await taskDevelopment(taskId)
    expect(links).toHaveLength(1)
    expect(links[0]).toMatchObject({ kind: "commit", title: `${code.toLowerCase()}-4: fix the login form`, authorLogin: "sita" })
  })

  it("ignores repositories that are not linked to the project", async () => {
    const commit = { id: "c".repeat(40), message: `${code}-4 elsewhere`, url: "https://x", timestamp: "2026-11-20T10:00:00Z" }
    expect(await recordPush({ repository: repository(otherGithubId), commits: [commit] })).toBe(0)
  })

  it("tracks a pull request from opened to merged", async () => {
    const pullRequest = {
      number: 12,
      title: "Improve login",
      body: `Closes ${code}-4`,
      html_url: "https://github.com/acme/app/pull/12",
      state: "open" as const,
      draft: true,
      created_at: "2026-11-21T10:00:00Z",
      user: { login: "ram" },
      head: { ref: "feature/login" },
    }
    await recordPullRequest({ action: "opened", repository: repository(githubId), pull_request: pullRequest })
    await recordPullRequest({
      action: "closed",
      repository: repository(githubId),
      pull_request: { ...pullRequest, title: "Improve the login form", body: null, state: "closed", merged: true },
    })
    const [link] = await db.select().from(taskGithubLinks).where(and(eq(taskGithubLinks.kind, "pull_request"), eq(taskGithubLinks.taskId, taskId)))
    expect(link).toMatchObject({ externalId: "12", state: "merged", title: "Improve the login form" })
  })
})
