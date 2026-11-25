import "server-only"
import { and, asc, count, eq, ne, type SQL } from "drizzle-orm"
import { ENGAGEMENT_TYPE_LABELS, ENGAGEMENT_TYPES, USER_STATUS_LABELS, USER_STATUSES } from "@/config/domain"
import { SYSTEM_ROLE_LABELS, SYSTEM_ROLES } from "@/config/roles"
import { type Facet, type ListParams, type PageResult, toPageResult } from "@/lib/list-params"
import { db } from "@/server/db"
import { departments, designations, memberProfiles, users } from "@/server/db/schema"
import { facetCounts, filterIdsIn, filterIn, orderFrom, pageWindow, searchAcross, totalCount } from "@/server/lib/query"

export const MEMBER_LIST_CONFIG = {
  filters: ["role", "status", "engagement", "department"] as const,
  sorts: ["name", "joinedOn", "createdAt"] as const,
  defaultSort: { id: "name" as const, desc: false },
}

export type MemberListParams = ListParams<
  (typeof MEMBER_LIST_CONFIG.filters)[number],
  (typeof MEMBER_LIST_CONFIG.sorts)[number]
>

export interface MemberRow {
  id: string
  name: string
  email: string
  image: string | null
  role: (typeof SYSTEM_ROLES)[number]
  status: (typeof USER_STATUSES)[number]
  engagementType: (typeof ENGAGEMENT_TYPES)[number] | null
  employeeCode: string | null
  departmentName: string | null
  designationName: string | null
  joinedOn: string | null
  accessExpiresAt: Date | null
}

const internalUser = ne(users.role, "client")

function memberConditions(params: MemberListParams, exclude?: keyof MemberListParams["filters"]): SQL | undefined {
  const { filters } = params
  return and(
    internalUser,
    searchAcross(params.q, [users.name, users.email, memberProfiles.employeeCode]),
    exclude === "role" ? undefined : filterIn(users.role, filters.role, SYSTEM_ROLES),
    exclude === "status" ? undefined : filterIn(users.status, filters.status, USER_STATUSES),
    exclude === "engagement" ? undefined : filterIn(memberProfiles.engagementType, filters.engagement, ENGAGEMENT_TYPES),
    exclude === "department" ? undefined : filterIdsIn(memberProfiles.departmentId, filters.department),
  )
}

function baseMemberQuery<TSelection extends Parameters<typeof db.select>[0]>(selection: TSelection) {
  return db
    .select(selection)
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
}

export async function listMembers(params: MemberListParams): Promise<PageResult<MemberRow>> {
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: users.role,
      status: users.status,
      engagementType: memberProfiles.engagementType,
      employeeCode: memberProfiles.employeeCode,
      departmentName: departments.name,
      designationName: designations.name,
      joinedOn: memberProfiles.joinedOn,
      accessExpiresAt: users.accessExpiresAt,
      total: totalCount,
    })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(departments, eq(departments.id, memberProfiles.departmentId))
    .leftJoin(designations, eq(designations.id, memberProfiles.designationId))
    .where(memberConditions(params))
    .orderBy(
      ...orderFrom(params.sort, { name: users.name, joinedOn: memberProfiles.joinedOn, createdAt: users.createdAt }, users.id),
    )
    .limit(pageWindow(params).limit)
    .offset(pageWindow(params).offset)

  const total = rows[0]?.total ?? 0
  return toPageResult(
    rows.map(({ total: _total, ...row }) => row),
    total,
    params,
  )
}

export async function memberFacets(params: MemberListParams): Promise<Facet[]> {
  const [roleCounts, statusCounts, engagementCounts, departmentCounts] = await Promise.all([
    baseMemberQuery({ value: users.role, count: count() }).where(memberConditions(params, "role")).groupBy(users.role),
    baseMemberQuery({ value: users.status, count: count() }).where(memberConditions(params, "status")).groupBy(users.status),
    baseMemberQuery({ value: memberProfiles.engagementType, count: count() })
      .where(memberConditions(params, "engagement"))
      .groupBy(memberProfiles.engagementType),
    db
      .select({ value: departments.id, label: departments.name, count: count(users.id) })
      .from(departments)
      .leftJoin(memberProfiles, eq(memberProfiles.departmentId, departments.id))
      .leftJoin(users, and(eq(users.id, memberProfiles.userId), memberConditions(params, "department")))
      .groupBy(departments.id, departments.name)
      .orderBy(asc(departments.name)),
  ])

  const roles = facetCounts(roleCounts)
  const statuses = facetCounts(statusCounts)
  const engagements = facetCounts(engagementCounts)
  const internalRoles = SYSTEM_ROLES.filter((role) => role !== "client")

  const facets: Facet[] = [
    { key: "role", title: "Role", options: internalRoles.map((role) => ({ value: role, label: SYSTEM_ROLE_LABELS[role], count: roles.get(role) ?? 0 })) },
    {
      key: "engagement",
      title: "Engagement",
      options: ENGAGEMENT_TYPES.map((type) => ({ value: type, label: ENGAGEMENT_TYPE_LABELS[type], count: engagements.get(type) ?? 0 })),
    },
    { key: "status", title: "Status", options: USER_STATUSES.map((status) => ({ value: status, label: USER_STATUS_LABELS[status], count: statuses.get(status) ?? 0 })) },
  ]

  if (departmentCounts.length > 0) {
    facets.push({
      key: "department",
      title: "Department",
      options: departmentCounts.map((row) => ({ value: row.value, label: row.label, count: row.count })),
    })
  }
  return facets
}

export async function getMember(userId: string) {
  return db.query.users.findFirst({
    where: (table, { and: both, eq: equals, ne: notEquals }) => both(equals(table.id, userId), notEquals(table.role, "client")),
    columns: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      accessExpiresAt: true,
      githubUsername: true,
      createdAt: true,
    },
    with: {
      profile: {
        with: {
          department: { columns: { id: true, name: true } },
          designation: { columns: { id: true, name: true } },
          manager: { columns: { id: true, name: true } },
        },
      },
    },
  })
}

export type MemberDetail = NonNullable<Awaited<ReturnType<typeof getMember>>>
