import "server-only"
import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { nextCookies } from "better-auth/next-js"
import { eq } from "drizzle-orm"
import { env, isProduction } from "@/config/env"
import { db } from "@/server/db"
import { accounts, rateLimits, sessions, users, verifications } from "@/server/db/schema"
import { sendMail } from "@/server/services/mailer"
import { isUserAccessAllowed } from "./access"
import { linkGithubLogin } from "@/server/modules/github/account-link"

const githubConfigured = Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET)

export const auth = betterAuth({
  appName: "KaamHub",
  baseURL: env.APP_URL,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user: users, session: sessions, account: accounts, verification: verifications, rateLimit: rateLimits },
  }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60 * 24,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Set your password",
        text: `Hello ${user.name},\n\nUse the link below to set your password. The link expires in 24 hours.\n\n${url}\n\nIf you did not expect this email, you can ignore it.`,
      })
    },
  },
  socialProviders: githubConfigured
    ? {
        github: {
          clientId: env.GITHUB_CLIENT_ID as string,
          clientSecret: env.GITHUB_CLIENT_SECRET as string,
          disableSignUp: true,
          disableImplicitSignUp: true,
        },
      }
    : undefined,
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["github"],
      allowDifferentEmails: true,
      updateUserInfoOnLink: false,
    },
  },
  user: {
    additionalFields: {
      role: { type: "string", input: false, required: false, defaultValue: "employee" },
      status: { type: "string", input: false, required: false, defaultValue: "active" },
      accessExpiresAt: { type: "date", input: false, required: false },
      githubUsername: { type: "string", input: false, required: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 60 * 5 },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: isProduction,
    ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] },
    database: { generateId: () => crypto.randomUUID() },
  },
  databaseHooks: {
    account: {
      create: {
        after: async (account) => {
          if (account.providerId !== "github" || !account.accessToken) return
          await linkGithubLogin(account.userId, account.accessToken)
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const [user] = await db
            .select({ status: users.status, accessExpiresAt: users.accessExpiresAt })
            .from(users)
            .where(eq(users.id, session.userId))
            .limit(1)
          if (!user || !isUserAccessAllowed(user)) return false
          return { data: session }
        },
      },
    },
  },
  plugins: [nextCookies()],
})

export const isGithubLoginConfigured = githubConfigured
