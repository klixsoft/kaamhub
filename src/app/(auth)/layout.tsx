import { KanbanSquareIcon, LayersIcon, ReceiptTextIcon, UsersIcon } from "lucide-react"
import { connection } from "next/server"
import { Suspense } from "react"
import { getCompanyName } from "@/server/modules/settings/queries"

const HIGHLIGHTS = [
  { icon: KanbanSquareIcon, title: "Projects and boards", text: "Plan work on Kanban boards and share progress with clients." },
  { icon: UsersIcon, title: "Team and freelancers", text: "Invite people with the right role and access end date." },
  { icon: ReceiptTextIcon, title: "Clients and invoices", text: "Share progress with clients and bill them from the same place." },
]

async function CompanyName() {
  await connection()
  return <>{await getCompanyName()}</>
}

function Brand({ className }: { className?: string }) {
  return (
    <div className={className}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <LayersIcon className="size-4" aria-hidden />
      </span>
      <Suspense fallback={<span className="sr-only">Loading</span>}>
        <CompanyName />
      </Suspense>
    </div>
  )
}

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r bg-muted/50 p-10 lg:flex">
        <Brand className="flex items-center gap-2 text-lg font-semibold" />
        <div className="flex max-w-md flex-col gap-8">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Everything your team delivers, in one place.</h2>
            <p className="text-muted-foreground">Projects, people, clients and billing, managed together.</p>
          </div>
          <ul className="flex flex-col gap-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="text-sm text-muted-foreground">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-muted-foreground">Access is by invitation only.</p>
      </aside>
      <section className="flex flex-col items-center justify-center gap-6 p-4 sm:p-10">
        <Brand className="flex items-center gap-2 font-semibold lg:hidden" />
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  )
}
