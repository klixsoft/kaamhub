import { formatDate } from "./format"

export interface ActivityEntryLike {
  action: string
  details: Record<string, string | null> | null
}

const quote = (value: string | null | undefined) => (value ? `“${value}”` : "nothing")

export function describeActivity(entry: ActivityEntryLike): string {
  const details = entry.details ?? {}
  switch (entry.action) {
    case "created":
      return "created this card"
    case "moved":
      return `moved this card from ${details.from ?? "a column"} to ${details.to ?? "a column"}`
    case "renamed":
      return `renamed this card from ${quote(details.from)} to ${quote(details.to)}`
    case "description_changed":
      return "updated the description"
    case "priority_changed":
      return `changed priority from ${details.from} to ${details.to}`
    case "type_changed":
      return `changed type from ${details.from} to ${details.to}`
    case "due_date_changed":
      if (!details.to) return "removed the due date"
      return details.from ? `changed the due date from ${formatDate(details.from)} to ${formatDate(details.to)}` : `set the due date to ${formatDate(details.to)}`
    case "visibility_changed":
      return `changed visibility to ${details.to}`
    case "assignee_added":
      return `assigned ${details.person ?? "someone"}`
    case "assignee_removed":
      return `unassigned ${details.person ?? "someone"}`
    case "checklist_item_added":
      return `added ${quote(details.item)} to the checklist`
    case "checklist_item_completed":
      return `completed ${quote(details.item)}`
    case "checklist_item_reopened":
      return `marked ${quote(details.item)} as not done`
    default:
      return "updated this card"
  }
}
