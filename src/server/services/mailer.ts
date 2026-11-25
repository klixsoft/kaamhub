import "server-only"
import nodemailer, { type Transporter } from "nodemailer"
import { env } from "@/config/env"
import { logger } from "@/server/lib/logger"

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

let transporter: Transporter | null = null

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
  })
  return transporter
}

export async function sendMail(message: MailMessage): Promise<void> {
  const transport = getTransporter()
  if (!transport) {
    logger.warn("SMTP is not configured; email not sent", {
      to: message.to,
      subject: message.subject,
      body: message.text,
      attachments: message.attachments?.map((attachment) => attachment.filename),
    })
    return
  }
  await transport.sendMail({ from: env.SMTP_FROM, ...message })
}
