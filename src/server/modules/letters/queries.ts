import "server-only"
import { and, asc, count, desc, eq, isNotNull, isNull, type SQL } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { LETTER_STATUS_LABELS, LETTER_STATUSES } from "@/config/letters"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import { db } from "@/server/db"
import { letters, letterTemplates, users } from "@/server/db/schema"
import { facetCounts, filterIdsIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"

export async function listTemplates(options: { includeArchived?: boolean } = {}) {
  return db
    .select({ id: letterTemplates.id, name: letterTemplates.name, title: letterTemplates.title, body: letterTemplates.body, archived: letterTemplates.archived, updatedAt: letterTemplates.updatedAt })
    .from(letterTemplates)
    .where(options.includeArchived ? undefined : eq(letterTemplates.archived, false))
    .orderBy(asc(letterTemplates.archived), asc(letterTemplates.name))
}

export type LetterTemplateRow = Awaited<ReturnType<typeof listTemplates>>[number]

export async function getTemplate(templateId: string) {
  const [template] = await db.select().from(letterTemplates).where(eq(letterTemplates.id, templateId)).limit(1)
  return template ?? null
}

export const LETTER_LIST_CONFIG = {
  filters: ["status", "template"] as const,
  sorts: ["number", "letterDate", "recipient"] as const,
  defaultSort: { id: "letterDate" as const, desc: true },
}

export type LetterListParams = ListParams<(typeof LETTER_LIST_CONFIG.filters)[number], (typeof LETTER_LIST_CONFIG.sorts)[number]>

const recipients = alias(users, "recipient")
const issuers = alias(users, "issuer")

function statusCondition(values: readonly string[] | undefined): SQL | undefined {
  const selected = (values ?? []).filter((value) => (LETTER_STATUSES as readonly string[]).includes(value))
  if (selected.length !== 1) return undefined
  return selected[0] === "revoked" ? isNotNull(letters.revokedAt) : isNull(letters.revokedAt)
}

function letterConditions(params: LetterListParams, exclude?: keyof LetterListParams["filters"]) {
  return and(
    searchAcross(params.q, [letters.number, letters.title, recipients.name, recipients.email]),
    exclude === "status" ? undefined : statusCondition(params.filters.status),
    exclude === "template" ? undefined : filterIdsIn(letters.templateId, params.filters.template),
  )
}

export async function listLetters(params: LetterListParams) {
  const window = pageWindow(params)
  const rows = await db
    .select({
      id: letters.id,
      number: letters.number,
      title: letters.title,
      letterDate: letters.letterDate,
      revokedAt: letters.revokedAt,
      recipientId: letters.recipientId,
      recipientName: recipients.name,
      recipientEmail: recipients.email,
      issuedBy: issuers.name,
      total: totalCount,
    })
    .from(letters)
    .innerJoin(recipients, eq(recipients.id, letters.recipientId))
    .leftJoin(issuers, eq(issuers.id, letters.issuedById))
    .where(letterConditions(params))
    .orderBy(...orderFrom(params.sort, { number: letters.number, letterDate: letters.letterDate, recipient: recipients.name }, letters.id))
    .limit(window.limit)
    .offset(window.offset)
  return toPageResult(
    rows.map(({ total: _total, ...row }) => row),
    rows[0]?.total ?? 0,
    params,
  )
}

export type LetterRow = Awaited<ReturnType<typeof listLetters>> extends PageResult<infer TRow> ? TRow : never

export async function letterFacets(params: LetterListParams): Promise<Facet[]> {
  const [statusRows, templateRows, templates] = await Promise.all([
    db
      .select({ revoked: isNotNull(letters.revokedAt), count: count() })
      .from(letters)
      .innerJoin(recipients, eq(recipients.id, letters.recipientId))
      .where(letterConditions(params, "status"))
      .groupBy(isNotNull(letters.revokedAt)),
    db
      .select({ value: letters.templateId, count: count() })
      .from(letters)
      .innerJoin(recipients, eq(recipients.id, letters.recipientId))
      .where(letterConditions(params, "template"))
      .groupBy(letters.templateId),
    db.select({ id: letterTemplates.id, name: letterTemplates.name }).from(letterTemplates).orderBy(asc(letterTemplates.name)),
  ])
  const statuses = new Map(statusRows.map((row) => [row.revoked ? "revoked" : "issued", row.count]))
  const byTemplate = facetCounts(templateRows)
  const facets: Facet[] = [{ key: "status", title: "Status", options: LETTER_STATUSES.map((value) => ({ value, label: LETTER_STATUS_LABELS[value], count: statuses.get(value) ?? 0 })) }]
  if (templates.length > 0) {
    facets.push({ key: "template", title: "Template", options: templates.map((template) => ({ value: template.id, label: template.name, count: byTemplate.get(template.id) ?? 0 })) })
  }
  return facets
}

export async function lettersForRecipient(recipientId: string, options: { includeRevoked: boolean }) {
  return db
    .select({ id: letters.id, number: letters.number, title: letters.title, letterDate: letters.letterDate, revokedAt: letters.revokedAt, revokedReason: letters.revokedReason })
    .from(letters)
    .where(and(eq(letters.recipientId, recipientId), options.includeRevoked ? undefined : isNull(letters.revokedAt)))
    .orderBy(desc(letters.letterDate), desc(letters.createdAt))
}

export type RecipientLetter = Awaited<ReturnType<typeof lettersForRecipient>>[number]

export async function getLetter(letterId: string) {
  const [letter] = await db
    .select({
      id: letters.id,
      number: letters.number,
      title: letters.title,
      body: letters.body,
      letterDate: letters.letterDate,
      layout: letters.layout,
      revokedAt: letters.revokedAt,
      recipientId: letters.recipientId,
      recipientName: users.name,
      recipientEmail: users.email,
    })
    .from(letters)
    .innerJoin(users, eq(users.id, letters.recipientId))
    .where(eq(letters.id, letterId))
    .limit(1)
  return letter ?? null
}
