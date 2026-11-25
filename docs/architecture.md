# Architecture

KaamHub is a single Next.js application. The UI and the server logic live in the same codebase; there is no separate API service.

## Folder structure

```
src/
├── app/                      Routes (App Router)
│   ├── (auth)/               Login, setup, password pages
│   ├── (app)/                Signed-in pages with the sidebar layout
│   └── api/                  Route handlers: auth, options search, health, webhooks
├── components/
│   ├── ui/                   shadcn/ui primitives (generated, keep edits minimal)
│   ├── layout/               PageHeader, sidebar, EmptyState, ButtonLink
│   ├── data-table/           TableRender and its toolbar, facets, pagination
│   ├── forms/                FormField, OptionCombobox, DatePicker, dialogs
│   └── <feature>/            Feature components: people, clients, projects, board, settings
├── config/                   Roles, permissions, navigation, domain constants, env
├── hooks/                    Client hooks
├── lib/                      Code shared by server and client (list params, formatting)
├── server/
│   ├── auth/                 Better Auth instance, session and permission helpers
│   ├── db/                   Drizzle client and schema
│   ├── lib/                  Server action wrapper, query helpers, errors, logger
│   ├── modules/<feature>/    queries.ts, actions.ts, schema.ts per feature
│   └── services/             Mailer, audit log
└── types/
```

Every file under `src/server` imports `server-only`, so it can never be bundled into the browser.

## Request flow

### Reading data

Pages are Server Components. Each page renders its static parts (title, layout) immediately and puts data inside `<Suspense>`:

```tsx
export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <PageHeader title="Projects" subtitle="…" actions={<Suspense fallback={null}><NewProjectAction /></Suspense>}>
      <Suspense fallback={<TableSkeleton columns={6} />}>
        <ProjectsData searchParams={searchParams} />
      </Suspense>
    </PageHeader>
  )
}
```

`ProjectsData` checks the session, parses the URL into typed list parameters, and calls the module's query functions.

### Writing data

Mutations are Server Actions built with two wrappers in `src/server/lib/action.ts`:

- `formAction({ schema, permission, handler })` for `<form action>` with `useActionState`
- `action({ schema, permission, handler })` for programmatic calls

Both wrappers:

1. load the current user (rejecting expired sessions and inactive users),
2. check the system permission,
3. validate input with zod and return field errors,
4. turn known `AppError`s into user-facing messages and log anything unexpected without exposing it.

Project-level checks (is this person a manager of this project?) use `requireProjectCapability` in `src/server/modules/projects/guard.ts`.

## Authorization

- **System permissions** are mapped to roles in `src/config/roles.ts`. Use `requirePermission()` in pages and the `permission` option in actions.
- **Project visibility** is a SQL condition (`projectVisibilityCondition`) added to every project query, so lists, counts and facets can never include projects the user cannot see.
- **Clients** are scoped through `client_contact`; client viewers only receive tasks whose visibility is `client`.
- The proxy (`src/proxy.ts`) only redirects visitors without a session cookie. It is a convenience, not the security boundary; every page and action checks the session itself.

## Lists: search, facets, sorting, pagination

1. `parseListParams(searchParams, CONFIG)` (`src/lib/list-params.ts`) turns the URL into a typed, whitelisted object. Unknown sort keys and filter values are ignored.
2. The module's `list*` query builds one SQL statement with `count(*) over()` so rows and the total come back together.
3. `*Facets` functions return grouped counts. Each facet's counts apply all other active filters except its own.
4. `TableRender` (client) renders the table, writes changes back to the URL and shows a pending state while the server responds.

```tsx
<TableRender
  columns={columns}
  result={result}
  facets={facets}
  getRowId={(row) => row.id}
  searchPlaceholder="Search projects…"
  emptyState={<EmptyState title="No projects yet" />}
/>
```

Column definitions live in a small client component per feature (for example `components/projects/projects-table.tsx`) because cell renderers are functions.

## Comboboxes

`OptionCombobox` handles single or multiple selection with static options or server search:

```tsx
<OptionCombobox name="clientId" resource="clients" placeholder="Search clients…" />
<OptionCombobox name="assigneeIds" multiple resource="project-members" resourceParams={{ projectId }} />
<OptionCombobox name="status" required options={statusOptions} defaultValue={…} />
```

Server search goes to `/api/options/[resource]`. Each resource is registered in `src/server/modules/options/registry.ts` with its own permission check and a 20-row limit. Selected values are submitted through hidden inputs (`name` or `name[]` for multiple).

## Dates

`DatePicker` wraps the shadcn Calendar in a Popover and submits `yyyy-MM-dd` through a hidden input. Date-only columns use PostgreSQL `date`.

## Caching

Cache Components and Partial Prerendering are enabled:

- Anything that reads the session runs at request time (`connection()` in `getCurrentUser`).
- Settings use `"use cache"` with a tag and are refreshed with `updateTag` when saved.
- The latest-release check is cached for 15 minutes.

## Database

- PostgreSQL with Drizzle ORM. The schema is split by domain in `src/server/db/schema/`.
- Foreign keys and indexes cover every filter and join used by list pages.
- Kanban order uses a floating `position` per task. Moving a task places it halfway between its neighbours; a column is renumbered only when the gap becomes too small.
- Task numbers come from an atomic counter on the project (`task_sequence`).

## GitHub access sync

See [github.md](github.md#how-access-sync-works).
