import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { RELEASE_REPOSITORY } from "@/config/app"
import { env } from "@/config/env"
import { compareVersions, isSemver } from "@/lib/semver"
import { logger } from "@/server/lib/logger"

export interface ReleaseInfo {
  version: string
  name: string
  publishedAt: string | null
  url: string
  notes: string
}

export interface VersionStatus {
  current: string
  latest: ReleaseInfo | null
  updateAvailable: boolean
  checkFailed: boolean
  repository: string
}

export const RELEASE_CACHE_TAG = "system:latest-release"

async function fetchLatestRelease(repository: string): Promise<ReleaseInfo | null> {
  "use cache"
  cacheTag(RELEASE_CACHE_TAG)
  cacheLife({ stale: 300, revalidate: 900, expire: 3600 })

  const response = await fetch(`https://api.github.com/repos/${repository}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "kaamhub-updater" },
  })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`GitHub releases request failed with ${response.status}`)

  const body = (await response.json()) as { tag_name: string; name: string | null; published_at: string | null; html_url: string; body: string | null }
  if (!isSemver(body.tag_name)) return null
  return {
    version: body.tag_name.replace(/^v/, ""),
    name: body.name || body.tag_name,
    publishedAt: body.published_at,
    url: body.html_url,
    notes: (body.body ?? "").slice(0, 5000),
  }
}

export async function getVersionStatus(): Promise<VersionStatus> {
  const current = env.APP_VERSION.replace(/^v/, "")
  const repository = RELEASE_REPOSITORY

  try {
    const latest = await fetchLatestRelease(repository)
    const updateAvailable = Boolean(latest && isSemver(current) && compareVersions(latest.version, current) > 0)
    return { current, latest, updateAvailable, checkFailed: false, repository }
  } catch (error) {
    logger.warn("Could not check for updates", { error })
    return { current, latest: null, updateAvailable: false, checkFailed: true, repository }
  }
}
