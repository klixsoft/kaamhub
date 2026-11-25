@AGENTS.md

Follow CONTRIBUTING.md and docs/architecture.md.

- Do not use single-line comments in code.
- Remove obsolete or replaced code when implementing a new requirement.
- Reuse PageHeader, TableRender, OptionCombobox, DatePicker, FormField, FormDialog and ConfirmDialog.
- Server data access goes in src/server/modules/<feature>; every query and action is authorized and validated.
- No N+1 queries.
