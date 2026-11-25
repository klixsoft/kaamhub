import "server-only"
import { and, eq, inArray, ne, or } from "drizzle-orm"
import { shiftDate, todayIso } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { db } from "@/server/db"
import { appSettings, managedServices, projectEnvironments, projects, serviceCategories, users } from "@/server/db/schema"
import { logger } from "@/server/lib/logger"
import { checkAllEnvironments } from "@/server/modules/environments/health"
import { generateDueServiceDrafts } from "@/server/modules/services/billing"
import { sendMail } from "@/server/services/mailer"
import { isModuleEnabled } from "@/server/modules/settings/queries"

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

async function expiringServices(dates: string[]): Promise<string[]> {
  if (!(await isModuleEnabled("services"))) return []
  const rows = await db
    .select({ name: managedServices.name, category: serviceCategories.name, expiresOn: managedServices.expiresOn, project: projects.name })
    .from(managedServices)
    .innerJoin(projects, eq(projects.id, managedServices.projectId))
    .leftJoin(serviceCategories, eq(serviceCategories.id, managedServices.categoryId))
    .where(and(eq(managedServices.status, "active"), inArray(managedServices.expiresOn, dates)))
  return rows.map((row) => `• ${row.name}${row.category ? ` (${row.category})` : ""} for ${row.project} expires on ${formatDate(row.expiresOn)}`)
}

async function expiringEnvironments(dates: string[]): Promise<string[]> {
  if (!(await isModuleEnabled("environments"))) return []
  const rows = await db
    .select({
      name: projectEnvironments.name,
      url: projectEnvironments.url,
      domainExpiresOn: projectEnvironments.domainExpiresOn,
      hostingExpiresOn: projectEnvironments.hostingExpiresOn,
      project: projects.name,
    })
    .from(projectEnvironments)
    .innerJoin(projects, eq(projects.id, projectEnvironments.projectId))
    .where(or(inArray(projectEnvironments.domainExpiresOn, dates), inArray(projectEnvironments.hostingExpiresOn, dates)))
  const dateSet = new Set(dates)
  return rows.flatMap((row) => {
    const label = `${row.project} – ${row.name}${row.url ? ` (${row.url})` : ""}`
    return [
      row.domainExpiresOn && dateSet.has(row.domainExpiresOn) ? `• Domain for ${label} expires on ${formatDate(row.domainExpiresOn)}` : null,
      row.hostingExpiresOn && dateSet.has(row.hostingExpiresOn) ? `• Hosting for ${label} expires on ${formatDate(row.hostingExpiresOn)}` : null,
    ].filter((line): line is string => line !== null)
  })
}

async function sendRenewalReminders(today: string): Promise<number> {
  const dates = REMINDER_OFFSETS.map((days) => shiftDate(today, days))
  const lines = [...(await expiringServices(dates)), ...(await expiringEnvironments(dates))]
  if (lines.length === 0) return 0

  const admins = await db
    .select({ email: users.email })
    .from(users)
    .where(and(inArray(users.role, ["super_admin", "admin"]), eq(users.status, "active")))
  if (admins.length === 0) return 0

  await sendMail({
    to: admins.map((admin) => admin.email),
    subject: `${lines.length} renewal${lines.length === 1 ? "" : "s"} coming up`,
    text: `These need renewal soon:\n\n${lines.join("\n")}\n`,
  })
  return lines.length
}

export async function runDailyJobs() {
  const today = todayIso()
  const drafts = (await isModuleEnabled("services")) ? await generateDueServiceDrafts() : { created: 0, failed: 0 }
  const firstRunToday = await claimDailyRun(today)
  const reminders = firstRunToday ? await sendRenewalReminders(today) : 0
  const uptime = (await isModuleEnabled("environments")) ? await checkAllEnvironments() : { checked: 0, down: 0 }
  logger.info("Daily jobs finished", { drafts, reminders, uptime, firstRunToday })
  return { drafts, reminders, uptime }
}
