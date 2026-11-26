import { z } from "zod"

const text = (max: number) => z.string().trim().max(max)

export const emailFormSchema = z
  .object({
    host: text(253),
    port: z.coerce.number().int("Enter a whole number").min(1, "Enter a port between 1 and 65535").max(65535, "Enter a port between 1 and 65535"),
    secure: z.stringbool().default(false),
    username: text(254),
    password: z.string().max(500).default(""),
    fromName: text(120),
    fromAddress: z.email("Enter a valid email address").max(254).or(z.literal("")),
  })
  .refine((value) => !value.host || value.fromAddress, { message: "Enter the address emails are sent from", path: ["fromAddress"] })

export type EmailFormInput = z.infer<typeof emailFormSchema>

export const testEmailSchema = z.object({ to: z.email("Enter a valid email address").max(254) })

export const githubAppFormSchema = z.object({
  appId: z.string().trim().regex(/^\d*$/, "The App ID is a number").max(20),
  installationId: z.string().trim().regex(/^\d*$/, "The installation ID is a number").max(20),
  organization: z.string().trim().regex(/^[A-Za-z0-9-]*$/, "Use the organisation login, e.g. acme").max(39),
  privateKey: z.string().trim().max(10000).default(""),
  webhookSecret: z.string().trim().max(500).default(""),
  clientId: z.string().trim().max(100),
  clientSecret: z.string().trim().max(500).default(""),
})

export type GithubAppFormInput = z.infer<typeof githubAppFormSchema>
