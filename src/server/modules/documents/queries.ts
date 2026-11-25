import "server-only"
import { and, count, eq } from "drizzle-orm"
import { TASK_VISIBILITIES, TASK_VISIBILITY_LABELS } from "@/config/domain"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import type { CurrentUser } from "@/server/auth/session"
import { db } from "@/server/db"
import { projectDocuments, users } from "@/server/db/schema"
import { facetCounts, filterIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"
import { type ProjectAccess, resolveProjectAccess } from "@/server/modules/projects/access"

export const DOCUMENT_LIST_CONFIG = {
  filters: ["visibility"] as const,
  sorts: ["title", "createdAt", "size"] as const,
  defaultSort: { id: "createdAt" as const, desc: true },
}

export type DocumentListParams = ListParams<(typeof DOCUMENT_LIST_CONFIG.filters)[number], (typeof DOCUMENT_LIST_CONFIG.sorts)[number]>

export function canModifyDocument(access: ProjectAccess, userId: string, uploadedById: string | null): boolean {
  return !access.isClientViewer && (access.canManage || (access.canEditTasks && uploadedById === userId))
}

function documentConditions(projectId: string, access: ProjectAccess, params: DocumentListParams, withVisibilityFilter = true) {
  return and(
    eq(projectDocuments.projectId, projectId),
    access.isClientViewer ? eq(projectDocuments.visibility, "client") : undefined,
    searchAcross(params.q, [projectDocuments.title, projectDocuments.fileName]),
    withVisibilityFilter ? filterIn(projectDocuments.visibility, params.filters.visibility, TASK_VISIBILITIES) : undefined,
  )
}

export async function listProjectDocuments(projectId: string, access: ProjectAccess, userId: string, params: DocumentListParams) {
  const window = pageWindow(params)
  const rows = await db
    .select({
      id: projectDocuments.id,
      title: projectDocuments.title,
      fileName: projectDocuments.fileName,
      mimeType: projectDocuments.mimeType,
      sizeBytes: projectDocuments.sizeBytes,
      visibility: projectDocuments.visibility,
      uploadedById: projectDocuments.uploadedById,
      uploadedBy: users.name,
      createdAt: projectDocuments.createdAt,
      total: totalCount,
    })
    .from(projectDocuments)
    .leftJoin(users, eq(users.id, projectDocuments.uploadedById))
    .where(documentConditions(projectId, access, params))
    .orderBy(...orderFrom(params.sort, { title: projectDocuments.title, createdAt: projectDocuments.createdAt, size: projectDocuments.sizeBytes }, projectDocuments.id))
    .limit(window.limit)
    .offset(window.offset)

  return toPageResult(
    rows.map(({ uploadedById, total: _total, ...row }) => ({ ...row, canModify: canModifyDocument(access, userId, uploadedById) })),
    rows[0]?.total ?? 0,
    params,
  )
}

export type DocumentRow = Awaited<ReturnType<typeof listProjectDocuments>> extends PageResult<infer TRow> ? TRow : never

export async function documentFacets(projectId: string, access: ProjectAccess, params: DocumentListParams): Promise<Facet[]> {
  if (access.isClientViewer) return []
  const rows = await db
    .select({ value: projectDocuments.visibility, count: count() })
    .from(projectDocuments)
    .where(documentConditions(projectId, access, params, false))
    .groupBy(projectDocuments.visibility)
  const counts = facetCounts(rows)
  return [{ key: "visibility", title: "Visibility", options: TASK_VISIBILITIES.map((value) => ({ value, label: TASK_VISIBILITY_LABELS[value], count: counts.get(value) ?? 0 })) }]
}

export async function loadDocument(documentId: string) {
  const [document] = await db
    .select({
      id: projectDocuments.id,
      projectId: projectDocuments.projectId,
      fileName: projectDocuments.fileName,
      mimeType: projectDocuments.mimeType,
      storageKey: projectDocuments.storageKey,
      visibility: projectDocuments.visibility,
      uploadedById: projectDocuments.uploadedById,
    })
    .from(projectDocuments)
    .where(eq(projectDocuments.id, documentId))
    .limit(1)
  return document ?? null
}

export async function readableDocument(user: CurrentUser, documentId: string) {
  const document = await loadDocument(documentId)
  if (!document) return null
  const access = await resolveProjectAccess(user, document.projectId)
  if (!access) return null
  if (access.isClientViewer && document.visibility !== "client") return null
  return document
}
