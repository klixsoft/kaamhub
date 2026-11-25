import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { RoleBadge, UserStatusBadge } from "@/components/people/badges"
import { MemberForm } from "@/components/people/member-form"
import { MemberStatusActions } from "@/components/people/member-status-actions"
import { Skeleton } from "@/components/ui/skeleton"
import { INTERNAL_ROLES, isAssignableRole } from "@/config/roles"
import { can, requirePermission } from "@/server/auth/session"
import { getMember, type MemberDetail } from "@/server/modules/people/queries"

export const metadata: Metadata = { title: "Member" }

function toDefaults(member: MemberDetail) {
  const profile = member.profile
  const asOption = (value: { id: string; name: string } | null | undefined) => (value ? { value: value.id, label: value.name } : null)
  return {
    userId: member.id,
    name: member.name,
    email: member.email,
    role: member.role,
    engagementType: profile?.engagementType ?? "permanent",
    employeeCode: profile?.employeeCode ?? null,
    phone: profile?.phone ?? null,
    department: asOption(profile?.department),
    designation: asOption(profile?.designation),
    manager: asOption(profile?.manager),
    joinedOn: profile?.joinedOn ?? null,
    engagementEndsOn: profile?.engagementEndsOn ?? null,
    accessExpiresOn: member.accessExpiresAt ? member.accessExpiresAt.toISOString().slice(0, 10) : null,
  }
}

async function MemberDetails({ params }: { params: PageProps<"/people/[userId]">["params"] }) {
  const [user, { userId }] = await Promise.all([requirePermission("people:read"), params])
  const member = await getMember(userId)
  if (!member) notFound()

  const editable = can(user, "people:write") && isAssignableRole(user.role, member.role)
  return (
    <PageHeader
      title={member.name}
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          {member.email}
          <RoleBadge role={member.role} />
          <UserStatusBadge status={member.status} />
          {member.githubUsername ? <span className="font-mono text-xs">@{member.githubUsername}</span> : null}
        </span>
      }
      actions={editable && member.id !== user.id ? <MemberStatusActions userId={member.id} name={member.name} status={member.status} /> : null}
      className="max-w-4xl"
    >
      {editable ? (
        <MemberForm defaults={toDefaults(member)} assignableRoles={INTERNAL_ROLES.filter((role) => isAssignableRole(user.role, role))} />
      ) : (
        <p className="text-sm text-muted-foreground">You can view this profile but not edit it.</p>
      )}
    </PageHeader>
  )
}

export default function MemberPage({ params }: PageProps<"/people/[userId]">) {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-[36rem] w-full max-w-4xl" /></div>}>
      <MemberDetails params={params} />
    </Suspense>
  )
}
