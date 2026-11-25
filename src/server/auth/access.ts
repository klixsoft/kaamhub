import type { UserStatus } from "@/config/domain"

export interface AccessState {
  status: UserStatus
  accessExpiresAt: Date | null
}

export function isUserAccessAllowed(user: AccessState, now: Date = new Date()): boolean {
  if (user.status !== "active") return false
  return !user.accessExpiresAt || user.accessExpiresAt > now
}
