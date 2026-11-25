import "server-only"
import { and, eq, inArray, ne } from "drizzle-orm"
import { SERVICE_TYPE_LABELS } from "@/config/finance"
import { shiftDate } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { todayIso } from "@/lib/dates"
import { db } from "@/server/db"
import { appSettings, managedServices, projects, users } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import { generateDueServiceDrafts } from "@/server/modules/services/billing"
import { sendMail } from "@/server/services/mailer"

const REMINDER_OFFSETS = [30, 7, 1] as const

async function claimDailyRun(today: string): Promise<boolean> {
  const [claimed] = await db
    .insert(appSettings)
    .values({ key: "jobs:daily", value: { lastRun: today } })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: { lastRun: today }, updatedAt: new Date() },
      setWhere: ne(appSettings.value, { lastRun: today }),
    })
    .returning({ key: appSettings.key })
  return Boolean(claimed)
}

async function sendRenewalReminders(today: string): Promise<number> {
  const dates = REMINDER_OFFSETS.map((days) => shiftDate(today, days))
  const expiring = await db
    .select({ name: managedServices.name, type: managedServices.type, expiresOn: managedServices.expiresOn, project: projects.name })
    .from(managedServices)
    .innerJoin(projects, eq(projects.id, managedServices.projectId))
    .where(and(eq(managedServices.status, "active"), inArray(managedServices.expiresOn, dates)))
  if (expiring.length === 0) return 0

  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.role, ["super_admin", "admin"]), eq(users.status, "active")))
  if (admins.length === 0) return 0

  const lines = expiring.map((service) => `• ${SERVICE_TYPE_LABELS[service.type]} ${service.name} (${service.project}) expires on ${formatDate(service.expiresOn)}`)
  await sendMail({
    to: admins.map((admin) => admin.email),
    subject: `${expiring.length} managed service${expiring.length === 1 ? "" : "s"} expiring soon`,
    text: `These services need renewal:\n\n${lines.join("\n")}\n`,
  })
  return expiring.length
}

export async function runDailyJobs() {
  const today = todayIso()
  const drafts = await generateDueServiceDrafts()
  const firstRunToday = await claimDailyRun(today)
  const reminders = firstRunToday ? await sendRenewalReminders(today) : 0
  logger.info("Daily jobs finished", { drafts, reminders, firstRunToday })
  return { drafts, reminders }
}
