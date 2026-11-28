import { GitCommitHorizontalIcon, GitPullRequestIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PULL_REQUEST_STATE_LABELS } from "@/config/domain"
import { formatDateTime } from "@/lib/format"
import type { TaskDevelopment } from "@/server/modules/github/card-links"

interface DevelopmentProps {
  taskId: string
  links: TaskDevelopment
}

export function Development({ taskId, links }: DevelopmentProps) {
  if (links.length === 0) return null
  const headingId = `development-${taskId}`

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <h3 id={headingId} className="flex items-center gap-2 text-sm font-semibold">
        <GitPullRequestIcon className="size-4" aria-hidden />
        Development
      </h3>
      <ul className="divide-y rounded-lg border">
        {links.map((link) => {
          const isPullRequest = link.kind === "pull_request"
          const Icon = isPullRequest ? GitPullRequestIcon : GitCommitHorizontalIcon
          return (
            <li key={link.id} className="flex items-start gap-3 p-3 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <a href={link.url} target="_blank" rel="noreferrer" className="truncate font-medium hover:underline">
                  {link.title}
                </a>
                <span className="text-xs text-muted-foreground">
                  {link.repository} {isPullRequest ? `#${link.externalId}` : link.externalId.slice(0, 7)}
                  {link.authorLogin ? ` · ${link.authorLogin}` : ""} · {formatDateTime(link.occurredAt)}
                </span>
              </div>
              {link.state ? (
                <Badge variant={link.state === "closed" ? "destructive" : link.state === "merged" ? "default" : "outline"}>
                  {PULL_REQUEST_STATE_LABELS[link.state]}
                </Badge>
              ) : null}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
