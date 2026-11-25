import { Badge } from "@/components/ui/badge"
import { CLIENT_STATUS_LABELS, type ClientStatus } from "@/config/domain"

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <Badge variant={status === "active" ? "secondary" : "outline"}>{CLIENT_STATUS_LABELS[status]}</Badge>
}
