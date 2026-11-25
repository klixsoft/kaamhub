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

Use [Conventional Commits](https://www.conventionalcommits.org/), e.g. `feat(projects): add archived filter`.

## Releasing (maintainers)

Update `version` in `package.json`, then tag and push:

```bash
git tag v0.2.0
```

```bash
git push origin v0.2.0
```

The release workflow builds the images and creates the GitHub Release that installations use to offer updates.
