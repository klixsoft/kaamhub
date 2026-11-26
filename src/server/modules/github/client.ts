import "server-only"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { AppError } from "@/server/lib/errors"
import { getGithubAppConfig } from "@/server/modules/integrations/config"

let cachedClient: { key: string; octokit: Octokit } | null = null

export async function isGithubAppConfigured(): Promise<boolean> {
  return (await getGithubAppConfig()) !== null
}

export async function githubOrg(): Promise<string | null> {
  return (await getGithubAppConfig())?.org ?? null
}

export async function getInstallationClient(): Promise<{ octokit: Octokit; org: string }> {
  const config = await getGithubAppConfig()
  if (!config) throw new AppError("The GitHub App is not configured.", "UNAVAILABLE")
  const key = `${config.appId}:${config.installationId}:${config.privateKey}`
  if (cachedClient?.key !== key) {
    cachedClient = {
      key,
      octokit: new Octokit({
        authStrategy: createAppAuth,
        auth: { appId: config.appId, privateKey: config.privateKey, installationId: config.installationId },
        userAgent: "kaamhub",
      }),
    }
  }
  return { octokit: cachedClient.octokit, org: config.org }
}

export interface GithubIdentity {
  id: string
  login: string
}

export async function fetchGithubIdentity(accessToken: string): Promise<GithubIdentity | null> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "kaamhub" },
    cache: "no-store",
  })
  if (!response.ok) return null
  const body = (await response.json()) as { id?: unknown; login?: unknown }
  return typeof body.login === "string" && typeof body.id === "number" ? { id: String(body.id), login: body.login } : null
}
