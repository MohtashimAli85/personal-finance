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
streaming chat endpoint and file exports.

## Writes: domain functions in `lib/`, thin server actions

Every write lives in a `lib/*.ts` domain function (`lib/transaction-mutations.ts`,
`lib/account-mutations.ts`, `lib/budget-mutations.ts`, `lib/budget-structure.ts`,
`lib/goal.ts`, `lib/bank-review.ts`, ...). A domain function:

1. Wraps multi-table writes in `db.transaction(() => { ... })` so they can't
   partially apply.
2. Takes cents and `YYYY-MM-DD` dates, and throws `UserError`
   (`lib/user-error.ts`) for an expected failure the user should see. Any
   other throw is a bug.

`app/actions/**/mutations.ts` holds the `"use server"` actions. Each one is a
thin wrapper built with `serverAction(schema, run)` (`lib/server-action.ts`):

1. It validates its single input object with zod (`lib/validation.ts` has the
   shared pieces). Server actions are public POST endpoints, so nothing
   reaches the DB unvalidated.
2. It calls the domain function.
3. It returns `ActionState` - a `UserError` or invalid input becomes
   `{ success: false, message, errors }` instead of a throw - and calls
   `refresh()` on success. Nothing is server-cached (SQLite is state outside
   the cache), so a refresh is all a write needs. Backup restore and Actual
   import also `revalidatePath("/", "layout")` before redirecting.

The client calls actions through `useServerAction` / `toastOnError`
(`hooks/use-server-action.ts`, `lib/action-result.ts`), which toast a failed
result, or `useActionFeedback` for inline form feedback. AI write tools
(`lib/ai/tools.ts`) call the same domain functions; they run in the chat
route handler, where `refresh()` isn't available, so they
`revalidatePath("/", "layout")`.

## Account balances: computed on read

There is no stored balance. `lib/balance.ts`'s `accountBalance` is a SQL
expression summing an account's cleared transactions (pending imports don't
count), selected by `lib/account.ts`. No write path has to keep a cache in
sync.

## Money: integer cents

Every money column in the schema, and every money value returned by a
`lib/*.ts` read function or taken by a domain write, is an **integer number
of cents** (`lib/money.ts`: `toCents`, `fromCents`, `formatMoney`). Server
actions are the one boundary that takes **decimals** - what the user typed -
and their zod schema converts them with `cents` / `positiveCents` from
`lib/validation.ts`, so cents never cross the wire. Floating point is only
touched at the outer edges - a form input's raw string, a CSV cell, a parsed
email amount - and converted immediately.

## Dates: plain calendar dates

The `date` column (and every date a server action accepts) is a
`YYYY-MM-DD` string (`lib/date.ts`: `toDateKey`, `tryParseDateKey`), never a
timestamp. A ledger entry is a calendar date, not an instant - storing it as
one avoids an entire class of timezone-shift bug where the day changes
depending on which timezone something is read back in.

## Budgeting: Actual Budget's envelope math

`lib/budget.ts`'s `getBudgetView(month)` reproduces Actual's
`loot-core/src/server/budget/envelope.ts`, walking month by month from the
first month with data:

- category balance = budgeted + spent + previous balance; a negative previous
  balance only carries if the category had rollover (`monthly_budgets.carryover`)
- otherwise the overspending resets to 0 and reduces next month's To Budget
- To Budget = income + (last To Budget + last hold) + last month's overspending
  − budgeted − hold (`budget_months.buffered`)

Amounts use Actual's signs (spent is negative). `test/budget.test.ts` pins the
rules; the numbers were checked against a real Actual export.

## AI layer (`lib/ai/`)

- `models.ts` builds the provider chain from the stored/env keys;
  `fallback.ts` wraps it in one `LanguageModelV4` that tries each model in
  order. Provider errors (bad key, 429, outage, offline) surface before any
  tokens stream, so falling through is invisible. A rejected key skips the
  rest of that provider's models.
- `context.ts` pre-computes a whole-rupee snapshot for the system prompt
  (`system-prompt.ts`) so the model quotes numbers instead of doing arithmetic.
- `tools.ts` has read tools (run automatically) and write tools. Write tools
  are listed in `toolApproval` as `user-approval` in `app/api/chat/route.ts`,
  so they only execute after the user confirms in the UI; approvals are
  HMAC-signed (`approval.ts`) so a crafted request can't approve a write.
  AI-facing amounts are PKR decimals; convert with `pkr()` / `toCents()`.
- The route validates incoming UI messages, persists them (`lib/chat.ts`)
  before and after streaming, and names new chats with the cheapest model.

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
4. Add the write as a domain function in `lib/`, in a `db.transaction`,
   throwing `UserError` for expected failures. Expose it with
   `serverAction(schema, run)` in `app/actions/**/mutations.ts`.
5. Add a test in `test/*.test.ts` - for DB-backed logic, use
   `test/db-test-utils.ts`'s `createTestDb()`, which gives you an isolated
   temp database with migrations applied. Import app modules dynamically
   *after* calling it (never a static top-level import of anything that
   reaches `lib/db`), or the module binds to the wrong database. Tests that
   call actions mock `next/cache` (`revalidatePath`, `refresh`).

## Database bootstrap

Importing `lib/db` only opens the connection. `instrumentation.ts`'s
`register()` runs `ensureDatabaseReady()` (`lib/db/bootstrap.ts`) once before
the server takes requests: migrations, a one-time email re-key backfill
(recorded in `app_settings`), category-group normalisation and the
income-group trigger. Tests call it from `createTestDb()`.
