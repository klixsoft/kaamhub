import type { Metadata } from "next"
import { Suspense } from "react"
import { PageHeader } from "@/components/layout/page-header"
import { MemberForm } from "@/components/people/member-form"
import { Skeleton } from "@/components/ui/skeleton"
import { INTERNAL_ROLES, isAssignableRole } from "@/config/roles"
import { requirePermission } from "@/server/auth/session"

export const metadata: Metadata = { title: "Invite member" }

async function InviteForm() {
  const user = await requirePermission("people:write")
  return <MemberForm assignableRoles={INTERNAL_ROLES.filter((role) => isAssignableRole(user.role, role))} />
}

export default function NewMemberPage() {
  return (
    <PageHeader title="Invite member" subtitle="Add an employee or freelancer. They will receive an email to set their password." className="max-w-4xl">
      <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
        <InviteForm />
      </Suspense>
    </PageHeader>
  )
}
