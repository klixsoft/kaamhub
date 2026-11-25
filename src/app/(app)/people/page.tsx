import { UserPlusIcon } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { MembersTable } from "@/components/people/members-table"
import { ButtonLink } from "@/components/layout/button-link"
import { parseListParams } from "@/lib/list-params"
import { can, requirePermission } from "@/server/auth/session"
import { listMembers, MEMBER_LIST_CONFIG, memberFacets } from "@/server/modules/people/queries"

export const metadata: Metadata = { title: "People" }

async function InviteAction() {
  const user = await requirePermission("people:read")
  if (!can(user, "people:write")) return null
  return (
    <ButtonLink href="/people/new">
      <UserPlusIcon aria-hidden />
      Invite member
    </ButtonLink>
  )
}

async function MembersData({ searchParams }: { searchParams: PageProps<"/people">["searchParams"] }) {
  await requirePermission("people:read")
  const params = parseListParams(await searchParams, MEMBER_LIST_CONFIG)
  const [result, facets] = await Promise.all([listMembers(params), memberFacets(params)])
  return <MembersTable result={result} facets={facets} />
}

export default function PeoplePage({ searchParams }: PageProps<"/people">) {
  return (
    <PageHeader
      title="People"
      subtitle="Employees and freelancers who work on your projects."
      actions={
        <Suspense fallback={null}>
          <InviteAction />
        </Suspense>
      }
    >
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <MembersData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
