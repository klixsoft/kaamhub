import { fileURLToPath } from "node:url"
import tsconfigPaths from "vite-tsconfig-paths"
import { defineConfig } from "vitest/config"

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: { "server-only": fileURLToPath(new URL("./tests/support/server-only.ts", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    env: {
      APP_URL: process.env.APP_URL ?? "http://localhost:3000",
      DATABASE_URL: process.env.DATABASE_URL ?? "postgres://kaamhub:kaamhub@localhost:5432/kaamhub_test",
      SESSION_SECRET: process.env.SESSION_SECRET ?? "test-session-secret-that-is-long-enough-0000",
      ENCRYPTION_KEY: process.env.ENCRYPTION_KEY ?? "0".repeat(64),
    },
  },
})
