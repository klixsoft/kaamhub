import "server-only"
import nodemailer from "nodemailer"
import { logger } from "@/server/lib/logger"
import { type EmailConfig, getEmailConfig } from "@/server/modules/integrations/config"

export interface MailAttachment {
  filename: string
  content: Buffer
  contentType: string
}

export interface MailMessage {
  to: string | string[]
  subject: string
  text: string
  html?: string
  attachments?: MailAttachment[]
}

function createTransport(config: EmailConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.username ? { user: config.username, pass: config.password } : undefined,
    connectionTimeout: 15000,
  })
}

export async function isEmailConfigured(): Promise<boolean> {
  return (await getEmailConfig()) !== null
}

export async function sendMail(message: MailMessage): Promise<void> {
  const config = await getEmailConfig()
  if (!config) {
    logger.warn("Email is not configured; email not sent", {
      to: message.to,
      subject: message.subject,
      body: message.text,
      attachments: message.attachments?.map((attachment) => attachment.filename),
    })
    return
  }
  await createTransport(config).sendMail({ from: config.from, ...message })
}

export async function verifyEmailConfig(config: EmailConfig): Promise<void> {
  await createTransport(config).verify()
}
