import { drizzle } from "drizzle-orm/postgres-js"
import { migrate } from "drizzle-orm/postgres-js/migrator"
import postgres from "postgres"
import { fileURLToPath } from "node:url"
import path from "node:path"

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error("DATABASE_URL is not set")
  process.exit(1)
}

const migrationsFolder = process.env.MIGRATIONS_DIR ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "drizzle")
const sql = postgres(databaseUrl, { max: 1, onnotice: () => {} })

try {
  await migrate(drizzle(sql), { migrationsFolder })
  console.log("Database migrations applied")
} catch (error) {
  console.error("Database migration failed", error)
  process.exitCode = 1
} finally {
  await sql.end()
}
