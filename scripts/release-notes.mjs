import { writeFileSync } from "node:fs"
import { git, latestTag, readCommits } from "./lib/commits.mjs"

/*
 * Builds the GitHub Release description from the Conventional Commits made since
 * the previous release, the people who wrote them, and the people contributing
 * for the first time. Usage:
 *
 *   node scripts/release-notes.mjs <tag> <output-file>
 *
 * GITHUB_REPOSITORY and GITHUB_TOKEN let it turn commit authors into GitHub
 * usernames. RELEASE_HIGHLIGHTS adds a short introduction at the top.
 */

const SECTIONS = [
  { title: "⚠️ Breaking changes", match: (commit) => commit.breaking },
  { title: "🚀 New features", match: (commit) => commit.type === "feat" },
  { title: "🐛 Bug fixes", match: (commit) => commit.type === "fix" },
  { title: "🔒 Security", match: (commit) => commit.type === "security" },
  { title: "⚡ Performance", match: (commit) => commit.type === "perf" },
  { title: "♻️ Improvements", match: (commit) => commit.type === "refactor" || commit.type === "style" },
  { title: "📚 Documentation", match: (commit) => commit.type === "docs" },
  { title: "🧰 Maintenance", match: (commit) => ["build", "ci", "chore", "test", "revert"].includes(commit.type) },
  { title: "Other changes", match: () => true },
]

const [tag, outputFile] = process.argv.slice(2)
const repository = process.env.GITHUB_REPOSITORY ?? ""
const token = process.env.GITHUB_TOKEN ?? ""
const highlights = (process.env.RELEASE_HIGHLIGHTS ?? "").trim()

if (!tag || !outputFile) {
  console.error("Usage: node scripts/release-notes.mjs <tag> <output-file>")
  process.exit(1)
}

async function githubLogins(commits) {
  const logins = new Map()
  if (!repository || !token) return logins
  for (const commit of commits) {
    if (logins.has(commit.email)) continue
    try {
      const response = await fetch(`https://api.github.com/repos/${repository}/commits/${commit.sha}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "kaamhub-release-notes" },
      })
      if (!response.ok) continue
      const body = await response.json()
      if (body.author?.login && body.author.type !== "Bot") logins.set(commit.email, body.author.login)
    } catch {
      continue
    }
  }
  return logins
}

function linkPullRequests(text) {
  return repository ? text.replace(/\(#(\d+)\)/g, `([#$1](https://github.com/${repository}/pull/$1))`) : text
}

function authorLabel(commit, logins) {
  const login = logins.get(commit.email)
  return login ? `@${login}` : commit.name
}

function commitLine(commit, logins) {
  const scope = commit.scope ? `**${commit.scope}:** ` : ""
  const sha = repository ? `[\`${commit.sha.slice(0, 7)}\`](https://github.com/${repository}/commit/${commit.sha})` : `\`${commit.sha.slice(0, 7)}\``
  return `- ${scope}${linkPullRequests(commit.description)} by ${authorLabel(commit, logins)} in ${sha}`
}

const previous = latestTag(tag)
const commits = readCommits(previous)
const earlierAuthors = new Set(previous ? git("log", "--format=%ae", previous).toLowerCase().split("\n").filter(Boolean) : [])
const logins = await githubLogins(commits)

const lines = []
if (highlights) lines.push("## Highlights", "", highlights.replace(/\\n/g, "\n"), "")
lines.push("## What's changed", "")

const remaining = [...commits]
for (const section of SECTIONS) {
  const matched = remaining.filter((commit) => section.match(commit))
  if (matched.length === 0) continue
  for (const commit of matched) remaining.splice(remaining.indexOf(commit), 1)
  lines.push(`### ${section.title}`, "", ...matched.map((commit) => commitLine(commit, logins)), "")
}
if (commits.length === 0) lines.push("No changes since the previous release.", "")

const firstCommitByAuthor = new Map()
for (const commit of [...commits].reverse()) {
  if (!firstCommitByAuthor.has(commit.email)) firstCommitByAuthor.set(commit.email, commit)
}

const contributors = [...firstCommitByAuthor.values()].map((commit) => authorLabel(commit, logins))
if (contributors.length > 0) lines.push("## Contributors", "", `Thank you ${contributors.join(", ")}!`, "")

const newContributors = [...firstCommitByAuthor.values()].filter((commit) => !earlierAuthors.has(commit.email))
if (newContributors.length > 0) {
  lines.push("## New contributors", "")
  for (const commit of newContributors) {
    const where = repository ? `[\`${commit.sha.slice(0, 7)}\`](https://github.com/${repository}/commit/${commit.sha})` : `\`${commit.sha.slice(0, 7)}\``
    lines.push(`- ${authorLabel(commit, logins)} made their first contribution in ${where}`)
  }
  lines.push("")
}

if (repository) {
  lines.push(
    previous
      ? `**Full changelog**: https://github.com/${repository}/compare/${previous}...${tag}`
      : `**Full changelog**: https://github.com/${repository}/commits/${tag}`,
  )
}

writeFileSync(outputFile, `${lines.join("\n").trim()}\n`)
console.log(`Release notes for ${tag}: ${commits.length} commits since ${previous ?? "the first commit"}, ${newContributors.length} new contributors`)
