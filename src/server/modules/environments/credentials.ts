import "server-only"
import { and, asc, eq, exists, inArray, not, or, sql } from "drizzle-orm"
import { db } from "@/server/db"
import { environmentCredentialAccess, environmentCredentials, projectEnvironments, projectMembers, users } from "@/server/db/schema"

export interface CredentialViewer {
  userId: string
  canManage: boolean
}

export function credentialVisibleTo(viewer: CredentialViewer) {
  if (viewer.canManage) return undefined
  const restricted = exists(
    db.select({ one: environmentCredentialAccess.userId }).from(environmentCredentialAccess).where(eq(environmentCredentialAccess.credentialId, environmentCredentials.id)),
  )
  const granted = exists(
    db
      .select({ one: environmentCredentialAccess.userId })
      .from(environmentCredentialAccess)
      .where(and(eq(environmentCredentialAccess.credentialId, environmentCredentials.id), eq(environmentCredentialAccess.userId, viewer.userId))),
  )
  return or(not(restricted), granted)
}

export async function listProjectCredentials(projectId: string, viewer: CredentialViewer) {
  const people = db
    .select({
      credentialId: environmentCredentialAccess.credentialId,
      list: sql<Array<{ id: string; name: string }>>`json_agg(json_build_object('id', ${users.id}, 'name', ${users.name}) order by ${users.name})`.as("list"),
    })
    .from(environmentCredentialAccess)
    .innerJoin(users, eq(users.id, environmentCredentialAccess.userId))
    .groupBy(environmentCredentialAccess.credentialId)
    .as("people")

  return db
    .select({
      id: environmentCredentials.id,
      environmentId: environmentCredentials.environmentId,
      label: environmentCredentials.label,
      username: environmentCredentials.username,
      loginUrl: environmentCredentials.loginUrl,
      hasNotes: sql<boolean>`${environmentCredentials.notesEncrypted} is not null`,
      allowedUsers: sql<Array<{ id: string; name: string }>>`coalesce(${people.list}, '[]'::json)`,
      updatedAt: environmentCredentials.updatedAt,
    })
    .from(environmentCredentials)
    .innerJoin(projectEnvironments, eq(projectEnvironments.id, environmentCredentials.environmentId))
    .leftJoin(people, eq(people.credentialId, environmentCredentials.id))
    .where(and(eq(projectEnvironments.projectId, projectId), credentialVisibleTo(viewer)))
    .orderBy(asc(environmentCredentials.label))
}

export type CredentialRow = Awaited<ReturnType<typeof listProjectCredentials>>[number]

export async function loadCredentialProject(credentialId: string) {
  const [row] = await db
    .select({ projectId: projectEnvironments.projectId, environmentId: environmentCredentials.environmentId })
    .from(environmentCredentials)
    .innerJoin(projectEnvironments, eq(projectEnvironments.id, environmentCredentials.environmentId))
    .where(eq(environmentCredentials.id, credentialId))
    .limit(1)
  return row ?? null
}

export async function loadEnvironmentProject(environmentId: string) {
  const [row] = await db.select({ projectId: projectEnvironments.projectId }).from(projectEnvironments).where(eq(projectEnvironments.id, environmentId)).limit(1)
  return row?.projectId ?? null
}

export async function readableCredential(credentialId: string, viewer: CredentialViewer) {
  const [row] = await db
    .select({ secretEncrypted: environmentCredentials.secretEncrypted, notesEncrypted: environmentCredentials.notesEncrypted, label: environmentCredentials.label })
    .from(environmentCredentials)
    .where(and(eq(environmentCredentials.id, credentialId), credentialVisibleTo(viewer)))
    .limit(1)
  return row ?? null
}

export async function projectMemberIds(projectId: string, userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  const rows = await db
    .select({ userId: projectMembers.userId })
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), inArray(projectMembers.userId, userIds)))
  return rows.map((row) => row.userId)
}
