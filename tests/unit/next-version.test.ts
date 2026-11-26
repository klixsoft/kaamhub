import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const script = path.resolve("scripts/next-version.mjs")
let repo: string

function setup(tag: string | null, messages: string[]) {
  repo = mkdtempSync(path.join(tmpdir(), "next-version-"))
  const git = (...args: string[]) => execFileSync("git", ["-c", "user.name=dev", "-c", "user.email=dev@test.invalid", ...args], { cwd: repo, stdio: "ignore" })
  git("init", "-q", "-b", "main")
  git("commit", "--allow-empty", "-m", "chore: initial commit")
  if (tag) git("tag", tag)
  for (const message of messages) git("commit", "--allow-empty", "-m", message)
}

function nextVersion(): string {
  const env = { ...process.env }
  delete env.GITHUB_OUTPUT
  return execFileSync("node", [script], { cwd: repo, env, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
}

afterEach(() => rmSync(repo, { recursive: true, force: true }))

describe("next version", () => {
  it.each([
    ["v0.2.0", ["fix(board): keep card order"], "0.2.1"],
    ["v0.2.0", ["perf: faster lists", "docs: typo"], "0.2.1"],
    ["v0.2.0", ["fix: a bug", "feat(projects): add archived filter"], "0.3.0"],
    ["v0.2.0", ["feat(auth)!: replace the session cookie"], "0.3.0"],
    ["v1.4.2", ["feat!: new storage layout"], "2.0.0"],
    ["v1.4.2", ["fix: crash\n\nBREAKING CHANGE: settings moved"], "2.0.0"],
    ["v1.4.2", ["update the readme"], "1.4.3"],
  ])("from %s with %j releases %s", (tag, messages, expected) => {
    setup(tag, messages)
    expect(nextVersion()).toBe(expected)
  })

  it("does not release when only docs, tests, CI or chores changed", () => {
    setup("v0.2.0", ["docs: explain releases", "ci: cache dependencies", "test: cover sessions", "chore: tidy", "build(deps): bump zod", "style: format"])
    expect(nextVersion()).toBe("")
  })

  it("starts at 0.1.0 when nothing has been released yet", () => {
    setup(null, ["feat: first feature"])
    expect(nextVersion()).toBe("0.1.0")
  })
})
