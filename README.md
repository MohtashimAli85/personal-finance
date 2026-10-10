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
- **Budgeting** works exactly like Actual Budget's envelope budget
  (`lib/budget.ts`): To Budget = income + last month's leftover To Budget −
  last month's overspending − this month's budgeted − money held for next
  month. Positive category balances roll over; overspending resets to 0 and is
  taken from next month's To Budget unless "Rollover overspending" is on for
  that category. Every transaction counts, cleared or pending.
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

## Savings goals

The **Goals** page tracks things you're saving for. Each goal is backed by a
budget category (created in a "Savings Goals" group, or an existing one you
link), so saving is just budgeting money into that category each month. A
goal's progress is the category's available balance, and the page shows how
much you need to budget per month to hit the target date.

## AI coach

The **AI Coach** page is a chat about your own money: how the month is going,
where spending can give, and how to save for something. It sees a pre-computed
snapshot of your accounts, budget, recent months and goals, and can look up
more (another month's budget, spending by category, a category's trend,
individual transactions). It can also create or update a goal and change a
category's budget, but only after you click **Confirm** on the proposed change.

- **Models**: Groq GPT-OSS 120B, falling back to GPT-OSS 20B, then Gemini 3.5
  Flash / Flash Lite when a provider is rate-limited, down, or rejects the key
  (`lib/ai/models.ts`, `lib/ai/fallback.ts`).
- **API keys**: add them on the **Settings** page. They're encrypted
  (AES-256-GCM) before being saved to the database and are never sent back to
  the browser. The encryption key is not stored in the database:
  - the desktop app generates one on first launch and keeps it in the OS
    keychain (Electron `safeStorage`);
  - a self-hosted/web deployment must set `APP_SECRET_KEY`
    (`openssl rand -hex 32`); without it, keys can't be saved from Settings.
  - `GROQ_API_KEY` / `GEMINI_API_KEY` env vars work too and take precedence.
- **About you**: Settings has a profile (name, a free-text "about me", and how
  you want to be coached) that is added to the coach's instructions so advice
  fits your situation. Stored locally in `app_settings`.
- **Privacy**: each chat sends the finance snapshot, your profile and any
  looked-up data to Groq (or Google on fallback).
- Chats are stored locally in the `chats` / `chat_messages` tables.

> **Self-hosting:** the app has no login. Anyone who can reach a self-hosted
> instance can see your finances and use your AI keys. Put it behind
> authentication (a reverse proxy with auth, Tailscale, Cloudflare Access, etc.).

## Importing from Actual Budget

Export a backup from Actual (Settings → Export), unzip it, then:

```bash
cp db.sqlite db.backup.sqlite
pnpm tsx scripts/import-actual-db.ts "<unzipped folder>/db.sqlite"
```

It replaces accounts, categories (including hidden ones), transactions,
budgets, rollover flags and holds with Actual's, following Actual's mapping for
merged categories. Savings goals whose category only exists in this app are
kept. Chats and settings are untouched.

## Testing

```bash
pnpm test
```

Tests run against isolated temporary SQLite databases (`test/db-test-utils.ts`),
never the project's own `db.sqlite`. Coverage so far: money/date/CSV parsing,
account balance recompute, envelope-budget carryover math, and the bank-parser
fixtures, savings goals, encrypted settings, the AI snapshot/tools, and the chat
route end to end with mock models (fallback, approval-gated writes). A Vitest
setup file points `APP_DB_PATH` at a throwaway file so a stray import can never
touch `db.sqlite`. See `test/*.test.ts`.

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
