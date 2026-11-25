"use client"

import { CheckSquareIcon, PlusIcon, XIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { ProgressBar } from "@/components/projects/progress-bar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useServerAction } from "@/hooks/use-server-action"
import { cn } from "@/lib/utils"
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/server/modules/tasks/actions"
import type { TaskDetail } from "@/server/modules/tasks/queries"

interface ChecklistProps {
  taskId: string
  items: TaskDetail["checklist"]
  canEdit: boolean
  onChange: () => void
}

export function Checklist({ taskId, items, canEdit, onChange }: ChecklistProps) {
  const { isPending, run } = useServerAction()
  const [text, setText] = useState("")
  const done = items.filter((item) => item.done).length

  if (items.length === 0 && !canEdit) return null

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!text.trim()) return
    run(() => addChecklistItem({ taskId, text }), undefined, () => {
      setText("")
      onChange()
    })
  }

  return (
    <section aria-labelledby="checklist-heading" className="flex flex-col gap-3">
      <h3 id="checklist-heading" className="flex items-center gap-2 text-sm font-semibold">
        <CheckSquareIcon className="size-4" aria-hidden />
        Checklist
      </h3>
      {items.length > 0 ? <ProgressBar done={done} total={items.length} /> : null}
      <ul className="flex flex-col gap-1">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-3 rounded-md px-1 py-1 hover:bg-muted/50">
            <Checkbox
              checked={item.done}
              disabled={!canEdit || isPending}
              onCheckedChange={(checked) => run(() => toggleChecklistItem({ itemId: item.id, done: checked === true }), undefined, onChange)}
              aria-label={item.text}
            />
            <span className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>{item.text}</span>
            {canEdit ? (
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => run(() => deleteChecklistItem({ itemId: item.id }), undefined, onChange)}
                aria-label={`Remove ${item.text}`}
              >
                <XIcon />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {canEdit ? (
        <form onSubmit={add} className="flex gap-2">
          <Input value={text} onChange={(event) => setText(event.target.value)} placeholder="Add an item" aria-label="New checklist item" maxLength={300} />
          <Button type="submit" variant="outline" disabled={isPending || !text.trim()}>
            <PlusIcon aria-hidden />
            Add
          </Button>
        </form>
      ) : null}
    </section>
  )
}
