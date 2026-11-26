import { execFileSync } from "node:child_process"

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<bang>!)?: (?<description>.+)$/
const SEMVER_TAG = /^v(\d+)\.(\d+)\.(\d+)$/

export function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim()
}

export function latestTag(exclude = null) {
  const tags = git("tag", "--merged", "HEAD", "--sort=-v:refname", "--list", "v*.*.*").split("\n").filter(Boolean)
  return tags.find((tag) => tag !== exclude && SEMVER_TAG.test(tag)) ?? null
}

export function parseVersion(tag) {
  const match = SEMVER_TAG.exec(tag ?? "")
  return match ? match.slice(1, 4).map(Number) : null
}

export function readCommits(since) {
  const separator = "\u001f"
  const end = "\u001e"
  const output = git("log", "--no-merges", `--format=%H${separator}%an${separator}%ae${separator}%s${separator}%b${end}`, since ? `${since}..HEAD` : "HEAD")
  return output
    .split(end)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [sha, name, email, subject, body] = entry.split(separator)
      const header = HEADER.exec(subject)?.groups
      return {
        sha,
        name,
        email: email.toLowerCase(),
        type: header?.type ?? "other",
        scope: header?.scope ?? null,
        description: header?.description ?? subject,
        breaking: Boolean(header?.bang) || /^BREAKING[ -]CHANGE:/m.test(body ?? ""),
      }
    })
    .filter((commit) => !/\[bot\]/.test(commit.name))
}
