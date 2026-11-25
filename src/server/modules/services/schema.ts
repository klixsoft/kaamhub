import { z } from "zod"
import { BILLING_CYCLES, SERVICE_STATUSES, SERVICE_TYPES, TAX_TREATMENTS } from "@/config/finance"

const emptyToNull = (value: string) => (value === "" ? null : value)
const optionalDate = z.string().trim().transform(emptyToNull).pipe(z.iso.date("Enter a valid date").nullable()).nullish()
const optionalText = (max: number) => z.string().trim().max(max).transform(emptyToNull).nullish()

export const serviceSchema = z.object({
  projectId: z.uuid(),
  type: z.enum(SERVICE_TYPES),
  name: z.string().trim().min(2, "Enter the service name, e.g. the domain").max(200),
  provider: optionalText(120),
  status: z.enum(SERVICE_STATUSES),
  startedOn: optionalDate,
  expiresOn: optionalDate,
  billingCycle: z.enum(BILLING_CYCLES),
  amount: z.coerce.number("Enter the amount").min(0).max(1_000_000_000),
  taxTreatment: z.enum(TAX_TREATMENTS),
  nextBillingOn: z.iso.date("Choose the next billing date"),
  notes: optionalText(1000),
})

export type ServiceInput = z.infer<typeof serviceSchema>

export const serviceUpdateSchema = serviceSchema.safeExtend({ serviceId: z.uuid() })
export const serviceIdSchema = z.object({ serviceId: z.uuid() })
