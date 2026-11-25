import { Badge } from "@/components/ui/badge"
import { USER_STATUS_LABELS, type UserStatus } from "@/config/domain"
import { SYSTEM_ROLE_LABELS, type SystemRole } from "@/config/roles"

export function RoleBadge({ role }: { role: SystemRole }) {
  return <Badge variant={role === "freelancer" ? "outline" : "secondary"}>{SYSTEM_ROLE_LABELS[role]}</Badge>
}

export function UserStatusBadge({ status }: { status: UserStatus }) {
  return (
    <Badge variant={status === "active" ? "outline" : "destructive"}>
      <span aria-hidden className={status === "active" ? "size-1.5 rounded-full bg-emerald-500" : "size-1.5 rounded-full bg-current"} />
      {USER_STATUS_LABELS[status]}
    </Badge>
  )
}
