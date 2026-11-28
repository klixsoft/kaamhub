import "server-only"
import { eq } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { ENGAGEMENT_TYPE_LABELS } from "@/config/domain"
import type { LetterLayout } from "@/config/letters"
import { formatDate } from "@/lib/format"
import type { LetterPlaceholder } from "@/lib/letter-placeholders"
import { db } from "@/server/db"
import { departments, designations, memberProfiles, users } from "@/server/db/schema"
import { getSettings } from "@/server/modules/settings/queries"

export type PlaceholderValues = Partial<Record<LetterPlaceholder, string>>

const managers = alias(users, "manager")

export async function recipientValues(userId: string): Promise<PlaceholderValues | null> {
  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      employeeCode: memberProfiles.employeeCode,
      engagementType: memberProfiles.engagementType,
      joinedOn: memberProfiles.joinedOn,
      endsOn: memberProfiles.engagementEndsOn,
      department: departments.name,
      designation: designations.name,
      manager: managers.name,
    })
    .from(users)
    .leftJoin(memberProfiles, eq(memberProfiles.userId, users.id))
    .leftJoin(departments, eq(departments.id, memberProfiles.departmentId))
    .leftJoin(designations, eq(designations.id, memberProfiles.designationId))
    .leftJoin(managers, eq(managers.id, memberProfiles.managerId))
    .where(eq(users.id, userId))
    .limit(1)
  if (!row) return null
  return {
    "recipient.name": row.name,
    "recipient.email": row.email,
    "recipient.employee_code": row.employeeCode ?? undefined,
    "recipient.engagement": row.engagementType ? ENGAGEMENT_TYPE_LABELS[row.engagementType] : undefined,
    "recipient.joined_on": row.joinedOn ? formatDate(row.joinedOn) : undefined,
    "recipient.ends_on": row.endsOn ? formatDate(row.endsOn) : undefined,
    "recipient.department": row.department ?? undefined,
    "recipient.designation": row.designation ?? undefined,
    "recipient.manager": row.manager ?? undefined,
  }
}

export async function companyValues(): Promise<PlaceholderValues> {
  const [general, billing, letters] = await Promise.all([getSettings("general"), getSettings("billing"), getSettings("letters")])
  return {
    "company.name": general.companyName,
    "company.legal_name": billing.legalName || general.companyName,
    "company.address": billing.address || undefined,
    "signatory.name": letters.signatoryName || undefined,
    "signatory.title": letters.signatoryTitle || undefined,
  }
}

export async function currentLayout(): Promise<LetterLayout> {
  const settings = await getSettings("letters")
  return {
    letterheadKey: settings.letterheadKey || null,
    topMm: settings.topMm,
    bottomMm: settings.bottomMm,
    leftMm: settings.leftMm,
    rightMm: settings.rightMm,
    signatoryName: settings.signatoryName,
    signatoryTitle: settings.signatoryTitle,
  }
}
