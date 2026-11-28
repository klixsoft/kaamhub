import type { Metadata } from "next"
import { Suspense } from "react"
import { TableSkeleton } from "@/components/data-table/table-skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { LettersNav } from "@/components/letters/letters-nav"
import { LettersTable } from "@/components/letters/letters-table"
import { todayIso } from "@/lib/dates"
import { parseListParams } from "@/lib/list-params"
import { requirePermission } from "@/server/auth/session"
import { LETTER_LIST_CONFIG, letterFacets, listLetters, listTemplates } from "@/server/modules/letters/queries"

export const metadata: Metadata = { title: "Letters" }

async function LettersData({ searchParams }: { searchParams: PageProps<"/letters">["searchParams"] }) {
  await requirePermission("letters:manage")
  const params = parseListParams(await searchParams, LETTER_LIST_CONFIG)
  const [result, facets, templates] = await Promise.all([listLetters(params), letterFacets(params), listTemplates()])
  return <LettersTable result={result} facets={facets} templates={templates} today={todayIso()} />
}

export default function LettersPage({ searchParams }: PageProps<"/letters">) {
  return (
    <PageHeader title="Letters" subtitle="Offer letters, contracts and certificates issued on your letterhead." actions={<LettersNav current="/letters" />}>
      <Suspense fallback={<TableSkeleton columns={5} />}>
        <LettersData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
