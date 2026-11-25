import "server-only"
import { and, eq, lte } from "drizzle-orm"
import { BILLING_CYCLE_LABELS, BILLING_CYCLE_MONTHS } from "@/config/finance"
import { addMonths, shiftDate } from "@/lib/dates"
import { formatDate } from "@/lib/format"
import { todayIso } from "@/lib/dates"
import { db } from "@/server/db"
import { managedServices, projects, serviceCategories } from "@/server/db/schema"
import { AppError, notFoundError } from "@/server/lib/errors"
import { logger } from "@/server/lib/logger"
import { insertDraft } from "@/server/modules/invoices/drafts"
import { getSettings } from "@/server/modules/settings/queries"

const MAX_PERIODS_PER_RUN = 12

type ServiceWithClient = typeof managedServices.$inferSelect & { clientId: string | null; categoryName: string | null }

async function draftForPeriod(service: ServiceWithClient, createdById: string | null) {
  if (!service.clientId) throw new AppError("Link this project to a client before invoicing its services.")
  const billing = await getSettings("billing")
  const periodStart = service.nextBillingOn
  const nextPeriod = addMonths(periodStart, BILLING_CYCLE_MONTHS[service.billingCycle])
  const periodEnd = shiftDate(nextPeriod, -1)
  const issueDate = todayIso()

  return db.transaction(async (tx) => {
    const invoice = await insertDraft(
      tx,
      {
        clientId: service.clientId as string,
        projectId: service.projectId,
        issueDate,
        dueDate: shiftDate(issueDate, billing.paymentTermsDays),
        discount: 0,
        notes: null,
        taxes: [],
        serviceId: service.id,
        servicePeriodStart: periodStart,
        items: [
          {
            description: `${service.categoryName ? `${service.categoryName}: ` : ""}${service.name} (${BILLING_CYCLE_LABELS[service.billingCycle]}, ${formatDate(periodStart)} – ${formatDate(periodEnd)})`,
            quantity: 1,
            unit: null,
            rate: service.amount,
          },
        ],
      },
      billing,
      createdById,
    )
    await tx.update(managedServices).set({ nextBillingOn: nextPeriod }).where(eq(managedServices.id, service.id))
    return invoice
  })
}

async function loadService(serviceId: string): Promise<ServiceWithClient> {
  const [row] = await db
    .select({ service: managedServices, clientId: projects.clientId, categoryName: serviceCategories.name })
    .from(managedServices)
    .innerJoin(projects, eq(projects.id, managedServices.projectId))
    .leftJoin(serviceCategories, eq(serviceCategories.id, managedServices.categoryId))
    .where(eq(managedServices.id, serviceId))
    .limit(1)
  if (!row) throw notFoundError("Service")
  return { ...row.service, clientId: row.clientId, categoryName: row.categoryName }
}

export async function generateServiceInvoice(serviceId: string, createdById: string) {
  const service = await loadService(serviceId)
  if (service.status !== "active") throw new AppError("Only active services can be invoiced.")
  const invoice = await draftForPeriod(service, createdById)
  if (!invoice) throw new AppError("A draft for this billing period already exists.", "CONFLICT")
  return invoice
}

export async function generateDueServiceDrafts(): Promise<{ created: number; failed: number }> {
  const billing = await getSettings("billing")
  const horizon = shiftDate(todayIso(), billing.recurringLeadDays)
  const due = await db
    .select({ service: managedServices, clientId: projects.clientId, categoryName: serviceCategories.name })
    .from(managedServices)
    .innerJoin(projects, eq(projects.id, managedServices.projectId))
    .leftJoin(serviceCategories, eq(serviceCategories.id, managedServices.categoryId))
    .where(and(eq(managedServices.status, "active"), lte(managedServices.nextBillingOn, horizon)))

  let created = 0
  let failed = 0
  for (const row of due) {
    let service: ServiceWithClient = { ...row.service, clientId: row.clientId, categoryName: row.categoryName }
    for (let period = 0; period < MAX_PERIODS_PER_RUN && service.nextBillingOn <= horizon; period++) {
      try {
        if (await draftForPeriod(service, null)) created++
        service = { ...service, nextBillingOn: addMonths(service.nextBillingOn, BILLING_CYCLE_MONTHS[service.billingCycle]) }
      } catch (error) {
        failed++
        logger.warn("Recurring invoice draft failed", { error, serviceId: service.id })
        break
      }
    }
  }
  return { created, failed }
}
