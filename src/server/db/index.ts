import "server-only"
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { env, isProduction } from "@/config/env"
import * as schema from "./schema"

const globalForDb = globalThis as unknown as { sql?: postgres.Sql }

const sql =
  globalForDb.sql ??
  postgres(env.DATABASE_URL, {
    max: env.DATABASE_POOL_MAX,
    idle_timeout: 30,
    connect_timeout: 10,
    prepare: true,
  })

if (!isProduction) globalForDb.sql = sql

export const db = drizzle(sql, { schema })

export type Database = typeof db
export type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]
