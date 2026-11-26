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
npm test
```

```bash
npm run build
```

Add or update tests in `tests/` when you change behaviour, especially anything to do with sign-in, permissions or money. See [Tests](docs/development.md#tests) for setting up the test database.

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

The type also decides the next version: `feat` raises the minor version, `fix` and similar the patch version, and documentation, test, CI and chore changes do not create a release on their own. Add `!` after the type (`feat(auth)!: ...`) or a `BREAKING CHANGE:` line in the body when existing installations must change something to upgrade; that raises the major version. Write the description as you want it to read in the release notes, in the imperative: "add archived filter", not "added" or "adds".

Your first merged commit is credited under **New contributors** in the next release.

## Releasing (maintainers)

Releases happen automatically. After a push to `main` passes CI, the version is worked out from the commit types above and the images, tag and release are published. A push with only `docs`, `test`, `ci`, `build`, `chore` or `style` commits does not create a release. To choose the version yourself or add highlights, use **Actions → Release → Run workflow**. See [Publishing a release](docs/deployment.md#publishing-a-release) for the rules and the pipeline.
