# Contributing

Thanks for helping improve KaamHub.

## Getting started

Follow [docs/development.md](docs/development.md) to run the app locally, and read [docs/architecture.md](docs/architecture.md) before larger changes.

## Before opening a pull request

```bash
npm run lint
```

```bash
npm run typecheck
```

```bash
npm run build
```

If you changed the database schema, include the generated migration (`npm run db:generate`).

## Code guidelines

- **Reuse before adding.** Use `PageHeader`, `TableRender`, `OptionCombobox`, `DatePicker`, `FormField`, `FormDialog` and `ConfirmDialog` instead of building new variants.
- **Server code stays on the server.** Database access lives in `src/server/modules/<feature>/queries.ts`; mutations in `actions.ts` using `formAction` or `action`.
- **Always authorize.** Pass `permission` to action wrappers, use `requirePermission` in pages, and apply `projectVisibilityCondition` or `requireProjectCapability` for project data.
- **Validate input** with zod schemas in the module's `schema.ts`.
- **No N+1 queries.** Lists must run a fixed number of queries regardless of row count. Use joins, `count(*) over()`, grouped counts or `json_agg`.
- **Strict TypeScript.** No `any`, and avoid type assertions unless unavoidable.
- **Comments.** Do not use single-line comments. Prefer clear names; if a comment is truly needed, use a block comment that explains *why*.
- **User-facing errors** must be plain language. Never show raw database or API errors.
- **Accessibility.** Every input has a label, buttons are real buttons, and dialogs have titles.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(projects): add archived filter`. The release notes are built from these messages, so the type decides where your change appears:

| Type | Use it for | Release notes section |
|---|---|---|
| `feat` | A new feature people will notice | New features |
| `fix` | A bug fix | Bug fixes |
| `security` | A security fix | Security |
| `perf` | Faster or lighter, same behaviour | Performance |
| `refactor`, `style` | Code changes that do not change behaviour | Improvements |
| `docs` | Documentation only | Documentation |
| `build`, `ci`, `chore`, `test`, `revert` | Tooling, dependencies and tests | Maintenance |

Add `!` after the type (`feat(auth)!: ...`) or a `BREAKING CHANGE:` line in the body when existing installations must change something to upgrade. Write the description as you want it to read in the release notes, in the imperative: "add archived filter", not "added" or "adds".

Your first merged commit is credited under **New contributors** in the next release.

## Releasing (maintainers)

Open **Actions → Release → Run workflow**, choose `main`, enter the version (for example `0.2.0`) and, optionally, a sentence of highlights. The workflow builds the images, creates the tag and publishes the release with generated notes. See [Publishing a release](docs/deployment.md#publishing-a-release) for the details and how to preview the notes.
