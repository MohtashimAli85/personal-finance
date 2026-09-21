# Personal Finance

A local-first, envelope-budgeting personal finance app. Next.js (App Router) reads
and writes a local SQLite database directly from server components and server
actions, and ships as a desktop app via Electron.

## Getting started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). A fresh database is created and
migrated automatically on first run (`db.sqlite` in the project root during
development).

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Run the test suite (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm check` | Lint/format check (Biome) |
| `pnpm format` | Lint/format, applying fixes |
| `pnpm db:generate` | Generate a Drizzle migration from a schema change |
| `pnpm db:studio` | Open Drizzle Studio against the local database |
| `pnpm db:reset` | Wipe and recreate the local database |
| `pnpm electron:dev` | Run the Electron shell against the dev server |
| `pnpm electron:build[:mac\|:win\|:linux]` | Build the packaged desktop app |

## Data model and architecture

- **Reads**: server components call synchronous read functions in `lib/*.ts`
  (`getAccounts`, `getTransactions`, `getBudgetView`, ...), which query SQLite
  directly via Drizzle. There is no API-route layer for reads.
- **Writes**: server actions in `app/actions/**/mutations.ts`, each wrapping its
  DB writes in `db.transaction(...)` and calling `revalidatePath` afterward.
- **Money** is stored and computed as integer cents (`lib/money.ts`), never
  floating point, to avoid rounding drift in running-total balances.
- **Dates** are stored as plain `YYYY-MM-DD` calendar dates (`lib/date.ts`), not
  timestamps - a ledger entry is a calendar date, not an instant.
- **Budgeting** is cumulative envelope budgeting (`lib/budget.ts`): a category's
  available balance is everything assigned to it minus everything spent from it,
  up to and including the viewed month - so unspent money carries forward and
  overspending carries forward as a negative, the way YNAB-style budgeting works.
- **Schema and migrations** live in `lib/db/schema.ts` and `drizzle/`. Migrations
  run automatically on boot (`lib/db/bootstrap.ts`); see that file for the exact
  order (migrate, seed default categories, normalize state).

## Bank Transactions (Gmail import)

The **Bank Transactions** page imports transactions from bank alert emails via
Gmail OAuth (read-only `gmail.readonly` scope). Configure `GOOGLE_CLIENT_ID` and
`GOOGLE_CLIENT_SECRET` (see `.env.example`) to enable it; without them the page
still works for manually entered and CSV-imported transactions.

Imported transactions land in a **review queue** on that page as `pending` -
they don't count toward budget activity until you assign a category and accept
them, so an unreviewed import can never silently skew your budget.

Per-bank parsing rules live in `lib/bank-parsers/` (one file per bank, plus a
generic fallback); `lib/bank-parsers/fixtures.ts` holds real-world email fixtures
that run in the test suite and via `npx tsx scripts/check-parsers.ts` for quick
manual iteration.

## Testing

```bash
pnpm test
```

Tests run against isolated temporary SQLite databases (`test/db-test-utils.ts`),
never the project's own `db.sqlite`. Coverage so far: money/date/CSV parsing,
account balance recompute, envelope-budget carryover math, and the bank-parser
fixtures. See `test/*.test.ts`.

## Desktop app (Electron)

`pnpm electron:build[:mac|:win|:linux]` builds a Next.js standalone server and
packages it with Electron via `electron-builder`. The packaged app resolves its
database to the OS's per-user application data directory (`app.getPath("userData")`)
and its migrations to a bundled `drizzle/` folder - never the project directory.

`scripts/verify-no-secrets.cjs` runs as an `electron-builder` `beforePack` hook
and refuses to package the app if a `.env` file or a local `db.sqlite` is present
in the build output, since the standalone build can otherwise contain a
developer's own local secrets and data. If you've ever run the standalone server
directly for local testing (`node .next/standalone/server.js`), delete `.next/`
before packaging to be safe.
