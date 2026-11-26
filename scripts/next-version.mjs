import { appendFileSync } from "node:fs"
import { latestTag, parseVersion, readCommits } from "./lib/commits.mjs"

/*
 * Works out the next version from the Conventional Commits since the latest
 * release tag and prints it, or prints nothing when only docs, tests, CI or
 * chores changed. Before 1.0.0, breaking changes raise the minor version.
 * In GitHub Actions the result is also written to the step outputs.
 */

const PATCH_TYPES = new Set(["fix", "security", "perf", "refactor", "other", "revert"])

function bumpFor(commits) {
  if (commits.some((commit) => commit.breaking)) return "major"
  if (commits.some((commit) => commit.type === "feat")) return "minor"
  if (commits.some((commit) => PATCH_TYPES.has(commit.type))) return "patch"
  return null
}

function nextVersion(current, bump) {
  const [major, minor, patch] = current ?? [0, 0, 0]
  if (!bump) return null
  if (bump === "major") return major === 0 ? `0.${minor + 1}.0` : `${major + 1}.0.0`
  if (bump === "minor") return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

const previous = latestTag()
const commits = readCommits(previous)
const bump = bumpFor(commits)
const version = previous ? nextVersion(parseVersion(previous), bump) : bump ? "0.1.0" : null

console.log(version ?? "")
console.error(`${commits.length} commits since ${previous ?? "the first commit"}; ${bump ? `${bump} release` : "nothing to release"}`)
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `version=${version ?? ""}\n`)
