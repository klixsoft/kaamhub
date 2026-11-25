import "server-only"
import { createAppAuth } from "@octokit/auth-app"
import { Octokit } from "@octokit/rest"
import { env } from "@/config/env"
import { AppError } from "@/server/lib/errors"

export interface GithubAppConfig {
  appId: string
  privateKey: string
  installationId: number
  org: string
}

function readConfig(): GithubAppConfig | null {
  if (!env.GITHUB_APP_ID || !env.GITHUB_APP_PRIVATE_KEY || !env.GITHUB_APP_INSTALLATION_ID || !env.GITHUB_ORG) return null
  return {
    appId: env.GITHUB_APP_ID,
    privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
    installationId: Number(env.GITHUB_APP_INSTALLATION_ID),
    org: env.GITHUB_ORG,
  }
}

const config = readConfig()
let installationClient: Octokit | null = null

export function isGithubAppConfigured(): boolean {
  return config !== null
}

export function githubOrg(): string | null {
  return config?.org ?? null
}

export function getInstallationClient(): { octokit: Octokit; org: string } {
  if (!config) throw new AppError("The GitHub App is not configured.", "UNAVAILABLE")
  installationClient ??= new Octokit({
    authStrategy: createAppAuth,
    auth: { appId: config.appId, privateKey: config.privateKey, installationId: config.installationId },
    userAgent: "kaamhub",
  })
  return { octokit: installationClient, org: config.org }
}

export async function fetchGithubLogin(accessToken: string): Promise<string | null> {
  const response = await fetch("https://api.github.com/user", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/vnd.github+json", "User-Agent": "kaamhub" },
    cache: "no-store",
  })
  if (!response.ok) return null
  const body = (await response.json()) as { login?: unknown }
  return typeof body.login === "string" ? body.login : null
}
