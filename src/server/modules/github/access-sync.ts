import "server-only"
import { and, eq, gt, inArray, isNotNull, isNull, or, sql } from "drizzle-orm"
import type { GithubPermission } from "@/config/domain"
import type { ProjectRole } from "@/config/roles"
import { db } from "@/server/db"
import { githubAccessGrants, githubRepositories, projectMembers, projectRepositories, users } from "@/server/db/schema"
import { mapWithConcurrency } from "@/server/lib/concurrency"
import { logger } from "@/server/lib/logger"
import { getSettings } from "@/server/modules/settings/queries"
import { getInstallationClient, isGithubAppConfigured } from "./client"
import { strongestPermission } from "./permissions"

interface SyncScope {
  userIds?: string[]
  repositoryIds?: string[]
}

interface Target {
  userId: string
  repositoryId: string
  login: string
  owner: string
  repo: string
}

type Change =
  | (Target & { kind: "grant"; permission: GithubPermission })
  | (Target & { kind: "revoke"; previousStatus: string })

const key = (userId: string, repositoryId: string) => `${userId}:${repositoryId}`
const API_CONCURRENCY = 4

function scopeCondition(scope: SyncScope, userColumn: Parameters<typeof inArray>[0], repoColumn: Parameters<typeof inArray>[0]) {
  return or(
    scope.userIds?.length ? inArray(userColumn, scope.userIds) : undefined,
    scope.repositoryIds?.length ? inArray(repoColumn, scope.repositoryIds) : undefined,
  )
}

async function loadDesired(scope: SyncScope, mapping: Record<ProjectRole, GithubPermission>) {
  const rows = await db
    .select({
      userId: projectMembers.userId,
      repositoryId: projectRepositories.repositoryId,
      login: users.githubUsername,
      owner: githubRepositories.owner,
      repo: githubRepositories.name,
      roles: sql<ProjectRole[]>`array_agg(distinct ${projectMembers.role})`,
    })
    .from(projectMembers)
    .innerJoin(projectRepositories, eq(projectRepositories.projectId, projectMembers.projectId))
    .innerJoin(githubRepositories, eq(githubRepositories.id, projectRepositories.repositoryId))
    .innerJoin(users, eq(users.id, projectMembers.userId))
    .where(
      and(
        scopeCondition(scope, projectMembers.userId, projectRepositories.repositoryId),
        eq(users.status, "active"),
        isNotNull(users.githubUsername),
        or(isNull(users.accessExpiresAt), gt(users.accessExpiresAt, new Date())),
      ),
    )
    .groupBy(projectMembers.userId, projectRepositories.repositoryId, users.githubUsername, githubRepositories.owner, githubRepositories.name)

  return new Map(
    rows.flatMap((row) => {
      const permission = strongestPermission(row.roles, mapping)
      return permission && row.login ? [[key(row.userId, row.repositoryId), { ...row, login: row.login, permission }] as const] : []
    }),
  )
}

async function loadExisting(scope: SyncScope) {
  const rows = await db
    .select({
      userId: githubAccessGrants.userId,
      repositoryId: githubAccessGrants.repositoryId,
      permission: githubAccessGrants.permission,
      status: githubAccessGrants.status,
      login: githubAccessGrants.githubLogin,
      owner: githubRepositories.owner,
      repo: githubRepositories.name,
    })
    .from(githubAccessGrants)
    .innerJoin(githubRepositories, eq(githubRepositories.id, githubAccessGrants.repositoryId))
    .where(scopeCondition(scope, githubAccessGrants.userId, githubAccessGrants.repositoryId))
  return new Map(rows.map((row) => [key(row.userId, row.repositoryId), row]))
}

function planChanges(
  desired: Awaited<ReturnType<typeof loadDesired>>,
  existing: Awaited<ReturnType<typeof loadExisting>>,
  removeOnUnassign: boolean,
): Change[] {
  const changes: Change[] = []
  for (const [entryKey, target] of desired) {
    const current = existing.get(entryKey)
    if (current && current.login !== target.login) changes.push({ kind: "revoke", previousStatus: current.status, ...current })
    if (
      !current ||
      current.login !== target.login ||
      current.permission !== target.permission ||
      current.status === "failed" ||
      current.status === "pending"
    ) {
      changes.push({ kind: "grant", ...target })
    }
  }
  if (removeOnUnassign) {
    for (const [entryKey, current] of existing) {
      if (!desired.has(entryKey)) changes.push({ kind: "revoke", previousStatus: current.status, ...current })
    }
  }
  return changes
}

async function revokeOnGithub(change: Extract<Change, { kind: "revoke" }>) {
  const { octokit } = getInstallationClient()
  if (change.previousStatus === "invited") {
    const invitations = await octokit.paginate(octokit.rest.repos.listInvitations, { owner: change.owner, repo: change.repo, per_page: 100 })
    const invitation = invitations.find((item) => item.invitee?.login.toLowerCase() === change.login.toLowerCase())
    if (invitation) await octokit.rest.repos.deleteInvitation({ owner: change.owner, repo: change.repo, invitation_id: invitation.id })
  }
  await octokit.rest.repos.removeCollaborator({ owner: change.owner, repo: change.repo, username: change.login })
}

async function applyChange(change: Change): Promise<void> {
  const where = and(eq(githubAccessGrants.userId, change.userId), eq(githubAccessGrants.repositoryId, change.repositoryId))
  try {
    if (change.kind === "revoke") {
      await revokeOnGithub(change)
      await db.delete(githubAccessGrants).where(where)
      return
    }
    const { octokit } = getInstallationClient()
    const response = await octokit.rest.repos.addCollaborator({
      owner: change.owner,
      repo: change.repo,
      username: change.login,
      permission: change.permission,
    })
    const status = response.status === 201 ? "invited" : "active"
    await db
      .insert(githubAccessGrants)
      .values({ userId: change.userId, repositoryId: change.repositoryId, githubLogin: change.login, permission: change.permission, status, error: null })
      .onConflictDoUpdate({
        target: [githubAccessGrants.userId, githubAccessGrants.repositoryId],
        set: { githubLogin: change.login, permission: change.permission, status, error: null, updatedAt: new Date() },
      })
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : "Unknown error"
    logger.warn("GitHub access change failed", { kind: change.kind, userId: change.userId, repositoryId: change.repositoryId, error })
    if (change.kind === "grant") {
      await db
        .insert(githubAccessGrants)
        .values({
          userId: change.userId,
          repositoryId: change.repositoryId,
          githubLogin: change.login,
          permission: change.permission,
          status: "failed",
          error: message,
        })
        .onConflictDoUpdate({
          target: [githubAccessGrants.userId, githubAccessGrants.repositoryId],
          set: { githubLogin: change.login, permission: change.permission, status: "failed", error: message, updatedAt: new Date() },
        })
    } else {
      await db.update(githubAccessGrants).set({ status: "failed", error: message }).where(where)
    }
  }
}

export async function reconcileGithubAccess(scope: SyncScope): Promise<{ applied: number }> {
  if (!isGithubAppConfigured()) return { applied: 0 }
  if (!scope.userIds?.length && !scope.repositoryIds?.length) return { applied: 0 }

  try {
    const settings = await getSettings("github")
    const [desired, existing] = await Promise.all([loadDesired(scope, settings.projectRolePermissions), loadExisting(scope)])
    const changes = planChanges(desired, existing, settings.removeAccessOnUnassign)
    await mapWithConcurrency(changes.filter((change) => change.kind === "revoke"), API_CONCURRENCY, applyChange)
    await mapWithConcurrency(changes.filter((change) => change.kind === "grant"), API_CONCURRENCY, applyChange)
    return { applied: changes.length }
  } catch (error) {
    logger.error("GitHub access reconciliation failed", { error, scope })
    return { applied: 0 }
  }
}

export async function syncUserGithubAccess(userId: string) {
  return reconcileGithubAccess({ userIds: [userId] })
}

export async function syncProjectGithubAccess(projectId: string, extra: SyncScope = {}) {
  const [members, repositories] = await Promise.all([
    db.select({ id: projectMembers.userId }).from(projectMembers).where(eq(projectMembers.projectId, projectId)),
    db.select({ id: projectRepositories.repositoryId }).from(projectRepositories).where(eq(projectRepositories.projectId, projectId)),
  ])
  return reconcileGithubAccess({
    userIds: [...members.map((row) => row.id), ...(extra.userIds ?? [])],
    repositoryIds: [...repositories.map((row) => row.id), ...(extra.repositoryIds ?? [])],
  })
}
