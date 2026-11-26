import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const script = path.resolve("scripts/release-notes.mjs")
let repo: string

function git(...args: string[]) {
  execFileSync("git", args, { cwd: repo, stdio: "ignore" })
}

function commit(message: string, author: string) {
  git("-c", `user.name=${author}`, "-c", `user.email=${author}@test.invalid`, "commit", "--allow-empty", "-m", message)
}

function notes(tag: string): string {
  const output = path.join(repo, `${tag}.md`)
  execFileSync("node", [script, tag, output], { cwd: repo, env: { ...process.env, GITHUB_REPOSITORY: "acme/app", GITHUB_TOKEN: "", RELEASE_HIGHLIGHTS: "" }, stdio: "ignore" })
  return readFileSync(output, "utf8")
}

beforeAll(() => {
  repo = mkdtempSync(path.join(tmpdir(), "release-notes-"))
  git("init", "-q", "-b", "main")
  commit("feat: first feature", "maintainer")
  git("tag", "v0.1.0")
  commit("feat(projects): add archived filter (#12)", "maintainer")
  commit("fix(board): keep card order after drag", "newcomer")
  commit("feat(auth)!: replace the session cookie", "maintainer")
  commit("docs: explain releases", "newcomer")
  commit("update readme", "maintainer")
})

afterAll(() => rmSync(repo, { recursive: true, force: true }))

describe("release notes", () => {
  it("groups commits since the previous tag by type, breaking changes first", () => {
    const text = notes("v0.2.0")
    expect(text).not.toContain("first feature")
    const order = ["### ⚠️ Breaking changes", "### 🚀 New features", "### 🐛 Bug fixes", "### 📚 Documentation", "### Other changes"].map((heading) => text.indexOf(heading))
    expect(order.every((position) => position >= 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
    expect(text).toContain("**projects:** add archived filter ([#12](https://github.com/acme/app/pull/12)) by maintainer")
  })

  it("credits everyone and lists first-time contributors", () => {
    const text = notes("v0.2.0")
    expect(text).toMatch(/## Contributors\n\nThank you (maintainer, newcomer|newcomer, maintainer)!/)
    const newContributors = text.slice(text.indexOf("## New contributors"))
    expect(newContributors).toContain("- newcomer made their first contribution")
    expect(newContributors).not.toContain("- maintainer made")
    expect(text).toContain("**Full changelog**: https://github.com/acme/app/compare/v0.1.0...v0.2.0")
  })
})
