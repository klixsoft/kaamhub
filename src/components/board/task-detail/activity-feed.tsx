"use client"

import { EyeIcon, HistoryIcon, MessageSquareIcon } from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "@/components/forms/confirm-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useServerAction } from "@/hooks/use-server-action"
import { formatDateTime, initials } from "@/lib/format"
import { describeActivity } from "@/lib/task-activity"
import { deleteComment, updateComment } from "@/server/modules/tasks/actions"
import type { TaskDetail } from "@/server/modules/tasks/queries"

type FeedItem =
  | { kind: "comment"; at: string; comment: TaskDetail["comments"][number] }
  | { kind: "activity"; at: string; entry: TaskDetail["activity"][number] }

function CommentItem({ comment, canModerate, onChange }: { comment: TaskDetail["comments"][number]; canModerate: boolean; onChange: () => void }) {
  const { isPending, run } = useServerAction()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)

  return (
    <li className="flex gap-3">
      <Avatar className="size-8">
        {comment.authorImage ? <AvatarImage src={comment.authorImage} alt="" /> : null}
        <AvatarFallback>{initials(comment.authorName ?? "?")}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">{comment.authorName ?? "Former member"}</span>
          {comment.authorRole === "client" ? <Badge variant="outline">Client</Badge> : comment.authorRole ? <Badge variant="secondary">Staff</Badge> : null}
          <span className="text-xs text-muted-foreground">
            {formatDateTime(comment.createdAt)}
            {comment.editedAt ? " (edited)" : ""}
          </span>
          {comment.visibility === "client" ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <EyeIcon className="size-3" aria-hidden />
              Shared with client
            </span>
          ) : null}
        </p>
        {editing ? (
          <div className="flex flex-col gap-2">
            <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} aria-label="Edit comment" />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={isPending || !draft.trim()}
                onClick={() =>
                  run(() => updateComment({ commentId: comment.id, body: draft }), undefined, () => {
                    setEditing(false)
                    onChange()
                  })
                }
              >
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border bg-card px-3 py-2 text-sm whitespace-pre-wrap break-words">{comment.body}</div>
        )}
        {!editing && (comment.isOwn || canModerate) ? (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {comment.isOwn ? (
              <button type="button" className="underline-offset-4 hover:text-foreground hover:underline" onClick={() => setEditing(true)}>
                Edit
              </button>
            ) : null}
            <ConfirmDialog
              trigger={
                <button type="button" className="underline-offset-4 hover:text-foreground hover:underline" disabled={isPending}>
                  Delete
                </button>
              }
              title="Delete this comment?"
              description="The comment is removed for everyone."
              confirmLabel="Delete"
              destructive
              onConfirm={() => run(() => deleteComment({ commentId: comment.id }), "Comment deleted", onChange)}
            />
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function ActivityFeed({ detail, onChange }: { detail: TaskDetail; onChange: () => void }) {
  const [showHistory, setShowHistory] = useState(true)
  const items: FeedItem[] = [
    ...detail.comments.map((comment) => ({ kind: "comment" as const, at: comment.createdAt.toString(), comment })),
    ...(showHistory ? detail.activity.map((entry) => ({ kind: "activity" as const, at: entry.createdAt.toString(), entry })) : []),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor="show-history" className="flex items-center gap-2 self-end text-xs text-muted-foreground">
        <Switch id="show-history" size="sm" checked={showHistory} onCheckedChange={setShowHistory} />
        Show history
      </label>
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <MessageSquareIcon className="size-4" aria-hidden />
          No comments yet. Start the discussion.
        </p>
      ) : (
        <ol className="flex flex-col gap-4">
          {items.map((item) =>
            item.kind === "comment" ? (
              <CommentItem key={item.comment.id} comment={item.comment} canModerate={detail.permissions.canModerate} onChange={onChange} />
            ) : (
              <li key={item.entry.id} className="flex items-start gap-3 text-sm text-muted-foreground">
                <span className="flex size-8 shrink-0 items-center justify-center">
                  <HistoryIcon className="size-4" aria-hidden />
                </span>
                <p className="pt-1.5">
                  <span className="font-medium text-foreground">{item.entry.actorName ?? "Someone"}</span> {describeActivity(item.entry)}
                  <span className="block text-xs">{formatDateTime(item.entry.createdAt)}</span>
                </p>
              </li>
            ),
          )}
        </ol>
      )}
    </div>
  )
}
