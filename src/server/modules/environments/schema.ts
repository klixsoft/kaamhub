import { z } from "zod"
import { ENVIRONMENT_KINDS } from "@/config/domain"

const emptyToNull = (value: string) => (value === "" ? null : value)
const optionalText = (max: number) => z.string().trim().max(max).transform(emptyToNull).nullish()
const optionalDate = z.string().trim().transform(emptyToNull).pipe(z.iso.date("Enter a valid date").nullable()).nullish()

export const environmentSchema = z.object({
  projectId: z.uuid(),
  name: z.string().trim().min(2, "Name the environment, e.g. Production").max(60),
  kind: z.enum(ENVIRONMENT_KINDS),
  url: z
    .string()
    .trim()
    .transform(emptyToNull)
    .pipe(z.url({ protocol: /^https?$/, message: "Enter a full URL, e.g. https://example.com" }).nullable())
    .nullish(),
  branch: optionalText(120),
  hostingProvider: optionalText(120),
  domainRegistrar: optionalText(120),
  domainExpiresOn: optionalDate,
  hostingExpiresOn: optionalDate,
  notes: optionalText(2000),
})

export type EnvironmentInput = z.infer<typeof environmentSchema>

export const environmentUpdateSchema = environmentSchema.safeExtend({ environmentId: z.uuid() })
export const environmentIdSchema = z.object({ environmentId: z.uuid() })

const credentialFields = {
  environmentId: z.uuid(),
  label: z.string().trim().min(2, "Describe the login, e.g. Admin user").max(80),
  username: optionalText(200),
  loginUrl: z
    .string()
    .trim()
    .transform(emptyToNull)
    .pipe(z.url({ protocol: /^https?$/, message: "Enter a full URL" }).nullable())
    .nullish(),
  notes: optionalText(2000),
  userIds: z.array(z.string().min(1)).max(50).default([]),
}

export const credentialCreateSchema = z.object({
  ...credentialFields,
  secret: z.string().min(1, "Enter the password or secret").max(2000),
})

export const credentialUpdateSchema = z.object({
  ...credentialFields,
  credentialId: z.uuid(),
  secret: z.string().max(2000).default(""),
})

export const credentialIdSchema = z.object({ credentialId: z.uuid() })
