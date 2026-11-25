"use client"

import { type FormEvent, useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { useServerAction } from "@/hooks/use-server-action"
import { addComment } from "@/server/modules/tasks/actions"

interface CommentComposerProps {
  taskId: string
  allowClientVisibility: boolean
  isClientViewer: boolean
  onPosted: () => void
}

export function CommentComposer({ taskId, allowClientVisibility, isClientViewer, onPosted }: CommentComposerProps) {
  const { isPending, run } = useServerAction()
  const [body, setBody] = useState("")
  const [shareWithClient, setShareWithClient] = useState(false)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim()) return
    run(
      () => addComment({ taskId, body, visibility: isClientViewer || shareWithClient ? "client" : "internal" }),
      undefined,
      () => {
        setBody("")
        setShareWithClient(false)
        onPosted()
      },
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit()
        }}
        placeholder="Write a comment…"
        aria-label="Write a comment"
        rows={3}
        maxLength={10000}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {allowClientVisibility && !isClientViewer ? (
          <label htmlFor="comment-share" className="flex items-center gap-2 text-xs text-muted-foreground">
            <Checkbox id="comment-share" checked={shareWithClient} onCheckedChange={(checked) => setShareWithClient(checked === true)} />
            Visible to client
          </label>
        ) : (
          <span className="text-xs text-muted-foreground">{isClientViewer ? "Your comment is shared with the project team." : "Internal comment"}</span>
        )}
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Posting…" : "Comment"}
        </Button>
      </div>
    </form>
  )
}
