import { execFile } from "node:child_process"
import { timingSafeEqual } from "node:crypto"
import { readFile, rename, writeFile } from "node:fs/promises"
import { createServer } from "node:http"

const config = {
  port: Number(process.env.PORT ?? 9000),
  token: process.env.UPDATER_TOKEN ?? "",
  composeFile: process.env.COMPOSE_FILE ?? "/stack/docker-compose.yml",
  envFile: process.env.ENV_FILE ?? "/stack/.env",
  projectName: process.env.COMPOSE_PROJECT_NAME ?? "kaamhub",
  service: process.env.APP_SERVICE ?? "app",
  tagVariable: process.env.IMAGE_TAG_VARIABLE ?? "APP_TAG",
}

if (config.token.length < 32) {
  console.error("UPDATER_TOKEN must be at least 32 characters")
  process.exit(1)
}

const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const MAX_LOG_LINES = 200
const MAX_BODY_BYTES = 1024

const status = { state: "idle", version: null, startedAt: null, finishedAt: null, log: [] }

function log(line) {
  const entry = `[${new Date().toISOString()}] ${line}`
  console.log(entry)
  status.log.push(entry)
  if (status.log.length > MAX_LOG_LINES) status.log.splice(0, status.log.length - MAX_LOG_LINES)
}

function authorized(request) {
  const header = request.headers.authorization ?? ""
  const expected = Buffer.from(`Bearer ${config.token}`)
  const received = Buffer.from(header)
  return received.length === expected.length && timingSafeEqual(received, expected)
}

function compose(...args) {
  const fullArgs = ["compose", "-p", config.projectName, "-f", config.composeFile, "--env-file", config.envFile, ...args]
  return new Promise((resolve, reject) => {
    execFile("docker", fullArgs, { timeout: 15 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      for (const line of `${stdout}\n${stderr}`.split("\n").filter(Boolean)) log(line)
      if (error) reject(error)
      else resolve()
    })
  })
}

async function setImageTag(version) {
  const current = await readFile(config.envFile, "utf8").catch(() => "")
  const line = `${config.tagVariable}=${version}`
  const pattern = new RegExp(`^${config.tagVariable}=.*$`, "m")
  const next = pattern.test(current) ? current.replace(pattern, line) : `${current.replace(/\n?$/, "\n")}${line}\n`
  const temporary = `${config.envFile}.tmp`
  await writeFile(temporary, next, { mode: 0o600 })
  await rename(temporary, config.envFile)
}

async function runUpdate(version) {
  Object.assign(status, { state: "running", version, startedAt: new Date().toISOString(), finishedAt: null, log: [] })
  try {
    log(`Updating ${config.service} to ${version}`)
    await setImageTag(version)
    await compose("pull", config.service)
    await compose("up", "-d", "--no-deps", config.service)
    log("Update finished")
    status.state = "succeeded"
  } catch (error) {
    log(`Update failed: ${error instanceof Error ? error.message : String(error)}`)
    status.state = "failed"
  } finally {
    status.finishedAt = new Date().toISOString()
  }
}

function send(response, code, body) {
  response.writeHead(code, { "Content-Type": "application/json", "Cache-Control": "no-store" })
  response.end(JSON.stringify(body))
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new Error("Body too large")
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"))
}

const server = createServer(async (request, response) => {
  if (request.url === "/health") return send(response, 200, { status: "ok" })
  if (!authorized(request)) return send(response, 401, { error: "Unauthorized" })

  if (request.method === "GET" && request.url === "/status") return send(response, 200, status)

  if (request.method === "POST" && request.url === "/update") {
    if (status.state === "running") return send(response, 409, { error: "Update already running" })
    let body
    try {
      body = await readJson(request)
    } catch {
      return send(response, 400, { error: "Invalid body" })
    }
    const version = typeof body?.version === "string" ? body.version.trim() : ""
    if (!VERSION_PATTERN.test(version)) return send(response, 400, { error: "Invalid version" })
    void runUpdate(version.replace(/^v/, ""))
    return send(response, 202, { accepted: true })
  }

  return send(response, 404, { error: "Not found" })
})

server.listen(config.port, () => console.log(`Updater listening on ${config.port}`))
