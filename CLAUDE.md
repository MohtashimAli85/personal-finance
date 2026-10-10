@AGENTS.md

# Project rules

## UI: always shadcn/ui
- Build UI from shadcn/ui components in `components/ui`. Don't hand-roll a
  button, dialog, popover, tabs, badge, progress bar, etc.
- If a component is missing, add it with the shadcn CLI
  (`pnpm dlx shadcn@latest add <component>`) instead of writing a custom one.
  Config is in `components.json` (style `radix-nova`, aliases `@/components/ui`).
- Style with Tailwind utility classes and the existing theme tokens.

## Code style: DRY and KISS
- Keep it simple. Choose the plainest solution that works; no speculative
  abstractions or options nobody asked for.
- Don't repeat yourself. Before writing a helper, look for an existing one in
  `lib/` or `hooks/` and reuse it; extract shared logic instead of copying it.
- No comments unless something is genuinely non-obvious.

## Business logic lives in custom hooks
- Components render. State, derived values, effects, event handlers and calls
  to server actions belong in custom hooks (`hooks/` for shared ones, or a
  `use-*.ts` file next to the feature for feature-specific ones).
- Keep hooks short and focused on one job. When a hook grows, split it into
  smaller hooks in separate files and compose them.
- One component or hook per file; split large files into smaller ones.

## Data and money
- Reads: synchronous functions in `lib/*.ts` called from server components.
  Writes: server actions in `app/actions/**/mutations.ts` with
  `db.transaction` + `revalidatePath`. See `docs/ARCHITECTURE.md`.
- Money is integer cents (`lib/money.ts`); dates are `YYYY-MM-DD` strings.
- Tests use `createTestDb()` and must import app modules dynamically after it,
  never touching the real `db.sqlite`.
