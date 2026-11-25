import { readFileSync } from "node:fs"

const lockFile = process.argv[2] ?? "package-lock.json"
const lock = JSON.parse(readFileSync(lockFile, "utf8"))
const packages = ["drizzle-orm", "postgres"]

console.log(packages.map((name) => `${name}@${lock.packages[`node_modules/${name}`].version}`).join(" "))
