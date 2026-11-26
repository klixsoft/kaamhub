import "server-only"
import { z } from "zod"

const optionalString = z
  .string()
  .trim()
  .transform((value) => (value === "" ? undefined : value))
  .optional()

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.url(),
  APP_VERSION: z.string().default("0.0.0-dev"),
  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .trim()
    .refine((value) => /^[0-9a-f]{64}$/i.test(value) || Buffer.from(value, "base64").length === 32, "ENCRYPTION_KEY must be 64 hex characters. Generate one with: openssl rand -hex 32"),
  STORAGE_DIR: z.string().trim().min(1).default("./storage"),
  CRON_SECRET: optionalString,
})

export type Env = z.infer<typeof envSchema>

function loadEnv(): Env {
  const parsed = envSchema.safeParse({ ...process.env, SESSION_SECRET: process.env.SESSION_SECRET ?? process.env.BETTER_AUTH_SECRET })
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`).join("\n")
    throw new Error(`Invalid environment configuration:\n${issues}`)
  }
  return parsed.data
}

export const env = loadEnv()

export const isProduction = env.NODE_ENV === "production"
