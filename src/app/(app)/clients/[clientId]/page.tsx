import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"
import { ClientContacts } from "@/components/clients/client-contacts"
import { ClientFormDialog } from "@/components/clients/client-form-dialog"
import { ClientStatusBadge } from "@/components/clients/client-status-badge"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectStatusBadge } from "@/components/projects/badges"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDate } from "@/lib/format"
import { can, requirePermission } from "@/server/auth/session"
import { isUuid } from "@/server/lib/query"
import { getClient } from "@/server/modules/clients/queries"

export const metadata: Metadata = { title: "Client" }

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm break-words">{children || "—"}</dd>
    </div>
  )
}

async function ClientDetails({ params }: { params: PageProps<"/clients/[clientId]">["params"] }) {
  const [user, { clientId }] = await Promise.all([requirePermission("clients:read"), params])
  if (!isUuid(clientId)) notFound()
  const client = await getClient(clientId)
  if (!client) notFound()
  const editable = can(user, "clients:write")

  return (
    <PageHeader
      title={client.name}
      subtitle={<ClientStatusBadge status={client.status} />}
      actions={editable ? <ClientFormDialog client={client} /> : null}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3">
              <Detail label="Email">{client.email}</Detail>
              <Detail label="Phone">{client.phone}</Detail>
              <Detail label="Website">
                {client.website ? (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="underline-offset-4 hover:underline">
                    {client.website}
                  </a>
                ) : null}
              </Detail>
              <Detail label="PAN / VAT">{client.taxNumber}</Detail>
              <Detail label="Address">{client.address}</Detail>
              {editable ? <Detail label="Internal notes">{client.notes}</Detail> : null}
            </dl>
          </CardContent>
        </Card>
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-3" aria-labelledby="projects-heading">
            <h2 id="projects-heading" className="font-semibold">
              Projects
            </h2>
            {client.projects.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">No projects for this client yet.</p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {client.projects.map((project) => (
                  <li key={project.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <Link href={`/projects/${project.id}`} className="min-w-0 hover:underline">
                      <span className="mr-2 font-mono text-xs text-muted-foreground">{project.code}</span>
                      <span className="font-medium">{project.name}</span>
                    </Link>
                    <span className="flex items-center gap-3 text-sm text-muted-foreground">
                      {project.dueDate ? `Due ${formatDate(project.dueDate)}` : null}
                      <ProjectStatusBadge status={project.status} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <ClientContacts clientId={client.id} contacts={client.contacts} editable={editable} />
        </div>
      </div>
    </PageHeader>
  )
}

export default function ClientPage({ params }: PageProps<"/clients/[clientId]">) {
  return (
    <Suspense fallback={<div className="p-6"><Skeleton className="h-96 w-full" /></div>}>
      <ClientDetails params={params} />
    </Suspense>
  )
}
