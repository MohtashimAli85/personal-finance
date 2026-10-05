# Codebase patterns

This documents the actual pattern in use, since an earlier plan doc (deleted)
described an API-route-based architecture the code never ended up using.

## Reads: direct DB calls in server components

Server components call synchronous read functions in `lib/*.ts` directly -
`getAccounts()`, `getTransactions()`, `getBudgetView()`, `getSummary()`,
`getGroupedCategories()`, `getBankTransactions()`. Each wraps a Drizzle query
against `lib/db`, most wrapped in React's `cache()` for per-request dedup.

There is **no API-route layer for reads** and no `lib/services.ts`/`fetchData`
indirection - a page or component that needs data imports the `lib/*.ts`
function and calls it directly. The `app/api/**` routes that do exist are for
things that must be HTTP endpoints for a reason outside this pattern - the
Google OAuth redirect handlers.

## Writes: server actions

All creates/updates/deletes live in `app/actions/**/mutations.ts` as
`"use server"` functions. Each one:

1. Wraps its DB writes in `db.transaction(() => { ... })` so a multi-table
   write (e.g. insert a transaction + adjust an account balance) can't
   partially apply.
2. Calls `revalidatePath(...)` for every route that reads data the write
   affects (typically `/`, `/transactions`, `/budget`).

## Money: integer cents

Every money column in the schema, and every money value returned by a
`lib/*.ts` read function or accepted by a server action's DB-facing
parameters, is an **integer number of cents** (`lib/money.ts`: `toCents`,
`fromCents`, `formatMoney`). Floating point is only touched at the outer
edges - a form input's raw string, a CSV cell, a parsed email amount - and
converted immediately.

## Dates: plain calendar dates

The `date` column (and every date a server action accepts) is a
`YYYY-MM-DD` string (`lib/date.ts`: `toDateKey`, `tryParseDateKey`), never a
timestamp. A ledger entry is a calendar date, not an instant - storing it as
one avoids an entire class of timezone-shift bug where the day changes
depending on which timezone something is read back in.

## Budgeting: cumulative envelope math

`lib/budget.ts`'s `getBudgetView(month)` computes each category's available
balance as everything assigned to it minus everything spent from it, **up to
and including** the viewed month - not just that month in isolation. This is
what makes unspent money carry forward and overspending carry forward as a
negative. See the tests in `test/budget.test.ts` for the exact invariants.

## Adding a new area (example: a new mutation)

1. Add the table/columns to `lib/db/schema.ts`, then write the migration by
   hand in `drizzle/000N_*.sql` (SQLite can't `ALTER COLUMN`, so a type change
   means a create-copy-drop-rename dance - see `drizzle/0003_*.sql` for the
   pattern, including the `PRAGMA defer_foreign_keys` trick for reordering
   FK-related table rebuilds inside one transaction). Update
   `drizzle/meta/_journal.json` and add a `NNNN_snapshot.json`.
2. **Test the migration against a copy of a real database before trusting
   it** - `pnpm db:reset` gives you a throwaway one, but if you have real
   data, copy `db.sqlite` elsewhere first and run migrations against the
   copy, asserting row counts and cent-for-cent balance totals match.
3. Add the read function to the relevant `lib/*.ts` file.
4. Add the write to `app/actions/**/mutations.ts`, in a `db.transaction`,
   with a `revalidatePath` call.
5. Add a test in `test/*.test.ts` - for DB-backed logic, use
   `test/db-test-utils.ts`'s `createTestDb()`, which gives you an isolated
   temp database with migrations applied.
