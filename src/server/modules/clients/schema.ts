import { z } from "zod"
import { CLIENT_STATUSES } from "@/config/domain"

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value === "" ? null : value))
    .nullish()

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Enter the client name").max(160),
  email: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.email("Enter a valid email address").nullable())
    .nullish(),
  phone: optionalText(40),
  website: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : value))
    .pipe(z.url({ protocol: /^https?$/, message: "Enter a full URL, e.g. https://example.com" }).nullable())
    .nullish(),
  taxNumber: optionalText(40),
  address: optionalText(500),
  notes: optionalText(2000),
  status: z.enum(CLIENT_STATUSES),
})

export type ClientInput = z.infer<typeof clientSchema>

export const clientContactSchema = z.object({
  clientId: z.uuid(),
  name: z.string().trim().min(2, "Enter the full name").max(120),
  email: z.email("Enter a valid email address").max(254),
  jobTitle: optionalText(120),
})
