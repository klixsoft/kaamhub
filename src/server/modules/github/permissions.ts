import { GITHUB_PERMISSIONS, type GithubPermission } from "@/config/domain"
import type { ProjectRole } from "@/config/roles"

const RANK = new Map(GITHUB_PERMISSIONS.map((permission, index) => [permission, index]))

export function strongestPermission(
  roles: readonly ProjectRole[],
  mapping: Record<ProjectRole, GithubPermission>,
): GithubPermission | null {
  let best: GithubPermission | null = null
  for (const role of roles) {
    const candidate = mapping[role]
    if (!best || (RANK.get(candidate) ?? 0) > (RANK.get(best) ?? 0)) best = candidate
  }
  return best
}
