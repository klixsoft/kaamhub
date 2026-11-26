import "server-only"
import { decryptSecret } from "@/server/lib/crypto"
import { getSettings } from "@/server/modules/settings/queries"

export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  from: string
}

export interface GithubAppConfig {
  appId: string
  privateKey: string
  installationId: number
  org: string
}

export interface GithubOAuthConfig {
  clientId: string
  clientSecret: string
}

function decrypt(value: string): string {
  return value ? decryptSecret(value) : ""
}

function formatSender(name: string, address: string): string {
  return name ? `"${name.replace(/["\\]/g, "")}" <${address}>` : address
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const settings = await getSettings("email")
  if (!settings.host || !settings.fromAddress) return null
  return {
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    password: decrypt(settings.passwordEncrypted),
    from: formatSender(settings.fromName, settings.fromAddress),
  }
}

export async function getGithubAppConfig(): Promise<GithubAppConfig | null> {
  const settings = await getSettings("githubApp")
  if (!settings.appId || !settings.installationId || !settings.organization || !settings.privateKeyEncrypted) return null
  return {
    appId: settings.appId,
    privateKey: decrypt(settings.privateKeyEncrypted),
    installationId: Number(settings.installationId),
    org: settings.organization,
  }
}

export async function getGithubOAuthConfig(): Promise<GithubOAuthConfig | null> {
  const settings = await getSettings("githubApp")
  if (!settings.clientId || !settings.clientSecretEncrypted) return null
  return { clientId: settings.clientId, clientSecret: decrypt(settings.clientSecretEncrypted) }
}

export async function getGithubWebhookSecret(): Promise<string | null> {
  const settings = await getSettings("githubApp")
  return settings.webhookSecretEncrypted ? decrypt(settings.webhookSecretEncrypted) : null
}

export interface EmailSettingsView {
  host: string
  port: number
  secure: boolean
  username: string
  hasPassword: boolean
  fromName: string
  fromAddress: string
}

export async function getEmailSettingsView(): Promise<EmailSettingsView> {
  const { passwordEncrypted, ...settings } = await getSettings("email")
  return { ...settings, hasPassword: Boolean(passwordEncrypted) }
}

export interface GithubAppSettingsView {
  appId: string
  installationId: string
  organization: string
  clientId: string
  hasPrivateKey: boolean
  hasWebhookSecret: boolean
  hasClientSecret: boolean
}

export async function getGithubAppSettingsView(): Promise<GithubAppSettingsView> {
  const { privateKeyEncrypted, webhookSecretEncrypted, clientSecretEncrypted, ...settings } = await getSettings("githubApp")
  return {
    ...settings,
    hasPrivateKey: Boolean(privateKeyEncrypted),
    hasWebhookSecret: Boolean(webhookSecretEncrypted),
    hasClientSecret: Boolean(clientSecretEncrypted),
  }
}
