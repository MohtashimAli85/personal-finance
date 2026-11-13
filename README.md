# Personal Finance

[![Release](https://img.shields.io/github/v/release/MohtashimAli85/personal-finance)](https://github.com/MohtashimAli85/personal-finance/releases/latest)
[![CI](https://github.com/MohtashimAli85/personal-finance/actions/workflows/ci.yml/badge.svg)](https://github.com/MohtashimAli85/personal-finance/actions/workflows/ci.yml)
[![Release build](https://github.com/MohtashimAli85/personal-finance/actions/workflows/release.yml/badge.svg)](https://github.com/MohtashimAli85/personal-finance/actions/workflows/release.yml)

A local-first, envelope-budgeting personal finance app for macOS, Windows and
Linux. Your data lives in a SQLite file on your own machine - no account, no
cloud sync, no server to trust.

## Features

- **Envelope budgeting** that works like Actual Budget: give all your income a job,
  roll leftovers forward, and see overspending carried into next month.
- **Dashboard** with net worth, cash flow, spending by group, money spent today,
  overspent categories and a configurable "house spend" total.
- **Accounts and transactions**, on-budget and off-budget, with CSV import and
  export.
- **Bank transactions from Gmail**: alert emails from any bank or wallet are
  parsed into a review queue, so nothing touches your budget until you accept it.
- **Savings goals** backed by budget categories, with the monthly amount needed
  to hit each target date.
- **AI coach**: chat about your own budget; it can propose goal and budget
  changes that apply only after you confirm them.
- **Import from Actual Budget**, plus backup and restore from Settings.
- **Privacy mode** to blur amounts when someone is looking over your shoulder.

## Download

Get the latest version from the
[Releases page](https://github.com/MohtashimAli85/personal-finance/releases/latest).

| Platform | File |
| --- | --- |
| Windows | `Personal.Finance.Setup.<version>.exe` (installer) or `Personal.Finance.<version>.exe` (portable) |
| macOS (Apple Silicon: M1 and later) | `Personal.Finance-<version>-arm64.dmg` |
| macOS (Intel) | `Personal.Finance-<version>.dmg` |
| Linux | `Personal.Finance-<version>.AppImage` or `personal-finance_<version>_amd64.deb` |

### Installing

The app is not code-signed yet, so your OS will warn about it the first time.

**Windows** - run the installer. If SmartScreen says *"Windows protected your
PC"*, click **More info → Run anyway**.

**macOS**

1. Open the `.dmg` and drag **Personal Finance** into **Applications**.
2. Before opening it, run this once in Terminal:

   ```bash
   xattr -cr "/Applications/Personal Finance.app"
   ```

3. Open the app.

If you opened it first and macOS said it *"could not verify"* the app, go to
**System Settings → Privacy & Security**, scroll to **Security** and click
**Open Anyway**. If the app then shows no window at all, run
`sudo killall syspolicyd` and open it again.

**Linux** - make the AppImage executable (`chmod +x Personal.Finance-*.AppImage`)
and run it, or install the `.deb` with `sudo apt install ./personal-finance_*_amd64.deb`.

### Updating

Quit the app, install the new version over the old one (on macOS, replace the
app in Applications and run the `xattr` command again), then open it. Your data
is kept outside the app, so updating never touches it:

| OS | Data folder |
| --- | --- |
| macOS | `~/Library/Application Support/personal-finance` |
| Windows | `%APPDATA%\personal-finance` |
| Linux | `~/.config/personal-finance` |

Database migrations run automatically on the first launch of a new version.
Settings → Backup lets you export a copy before upgrading if you want one.

## Development

Requires Node.js 24+ and pnpm.

```bash
pnpm install
pnpm dev            # web app at http://localhost:3000
pnpm electron:dev   # the desktop app, running against the dev server
```

A fresh database is created and migrated on first run (`db.sqlite` in the
project root during development).

| Command | What it does |
|---|---|
| `pnpm dev` | Start the Next.js dev server |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | Lint (oxlint) |
| `pnpm check` | Lint/format check (Biome) |
| `pnpm format` | Lint/format, applying fixes |
| `pnpm test` | Run the test suite (Vitest) |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm db:generate` | Generate a Drizzle migration from a schema change |
| `pnpm db:studio` | Open Drizzle Studio against the local database |
| `pnpm db:reset` | Wipe and recreate the local database |
| `pnpm electron:dev` | Run the Electron shell against the dev server |
| `pnpm electron:build[:mac\|:win\|:linux]` | Build the packaged desktop app into `release/` |

### Architecture

- **Reads**: server components call synchronous read functions in `lib/*.ts`
  (`getAccounts`, `getTransactions`, `getBudgetView`, ...), which query SQLite
  directly via Drizzle. There is no API-route layer for reads.
- **Writes**: server actions in `app/actions/**/mutations.ts`, each wrapping its
  DB writes in `db.transaction(...)` and refreshing the page afterward.
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
  run automatically on boot (`lib/db/bootstrap.ts`).

More detail in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Testing

```bash
pnpm test
```

Tests run against isolated temporary SQLite databases (`test/db-test-utils.ts`),
never the project's own `db.sqlite`; a Vitest setup file points `APP_DB_PATH` at
a throwaway file so a stray import can't touch it. Coverage includes money, date
and CSV parsing, balance recompute, envelope-budget carryover, the Actual import,
the bank-parser fixtures, savings goals, encrypted settings, the dashboard, the
AI snapshot and tools, and the chat route end to end with mock models.

## Feature details

### Bank transactions (Gmail import)

The **Bank Transactions** page imports transactions from bank alert emails via
Gmail IMAP. Connect it with your Gmail address and an
[app password](https://myaccount.google.com/apppasswords) (needs 2-Step
Verification). The app password is stored encrypted; without a connection the
app still works for manually entered and CSV-imported transactions.

Imported transactions land in a **review queue** as `pending` - they don't count
toward budget activity until you assign a category and accept them, so an
unreviewed import can never silently skew your budget.

Parsing lives in `lib/bank-parsers/`: one bank-agnostic parser that reads the
amount, direction, date and payee from any alert (including wallet apps that put
the whole alert in the subject line), with an AI pass for formats it can't read.
`lib/bank-parsers/fixtures.ts` holds anonymised real-world email fixtures that
run in the test suite and via `npx tsx scripts/check-parsers.ts` for quick
manual iteration.

### Savings goals

The **Goals** page tracks things you're saving for. Each goal is backed by a
budget category (created in a "Savings Goals" group, or an existing one you
link), so saving is just budgeting money into that category each month. A
goal's progress is the category's available balance, and the page shows how
much you need to budget per month to hit the target date.

### AI coach

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
  - `GROQ_API_KEY` / `GEMINI_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY`
    env vars work too and take precedence.
- **About you**: Settings has a profile (name, a free-text "about me", and how
  you want to be coached) that is added to the coach's instructions so advice
  fits your situation.
- **Privacy**: each chat sends the finance snapshot, your profile and any
  looked-up data to the AI provider. Chats themselves are stored locally.

### Importing from Actual Budget

Export a backup from Actual (Settings → Export), then either:

- **In the app**: Settings → *Import from Actual Budget*, choose the `.zip` (or
  its `db.sqlite`), review the preview of accounts, categories, transactions,
  budgets and the goals that are kept, and confirm. Your current database is
  copied to a `backups/` folder next to it first.
- **From the command line**:

  ```bash
  pnpm tsx scripts/import-actual-db.ts "<export>.zip"   # or the extracted db.sqlite
  ```

Files that aren't an Actual export are rejected before anything is written.
The import replaces accounts, categories (including hidden ones), transactions,
budgets, rollover flags and holds with Actual's, following Actual's mapping for
merged categories. Savings goals whose category only exists in this app are
kept. Chats and settings are untouched. Uploads up to 200 MB are accepted.

### Self-hosting

The web app has no login. Anyone who can reach a self-hosted instance can see
your finances and use your AI keys, so put it behind authentication (a reverse
proxy with auth, Tailscale, Cloudflare Access, etc.).

## Releasing

Releases are built and published by GitHub Actions
([`release.yml`](.github/workflows/release.yml)) when a version tag is pushed.

1. Bump `version` in `package.json` and commit it
   (`chore(release): bump to x.y.z`).
2. Push `main`, then tag and push the tag:

   ```bash
   git tag v0.2.6 && git push origin v0.2.6
   ```

The tag must match the `package.json` version or the build fails. For each
platform the workflow then:

- builds the app (Windows `.exe` installer and portable, Linux `.AppImage` and
  `.deb`, macOS `.dmg` and `.zip` for Apple Silicon and Intel);
- checks every package opens (`hdiutil verify`, `dpkg-deb`, AppImage extraction,
  `7z t`);
- unpacks the package and starts the bundled server, failing the release unless
  it answers HTTP 200;
- publishes a GitHub Release with all files attached.

Release notes are written by
[`.github/scripts/release-notes.sh`](.github/scripts/release-notes.sh) from the
commits since the previous tag, grouped by
[Conventional Commit](https://www.conventionalcommits.org/) type (`feat` →
Features, `fix` → Fixes, `perf` → Performance, everything else → Other changes),
followed by the download table and install notes. Write commit subjects as you
want them to read in the notes; `chore(release)` commits are left out.

To build the packages without publishing (for example to test a branch), run
the **Release** workflow manually from the Actions tab.

### Packaging safety

`scripts/verify-no-secrets.cjs` runs as an `electron-builder` `beforePack` hook
and refuses to package the app if a `.env` file or a local `db.sqlite` is present
in the build output, since the standalone build can otherwise contain a
developer's own secrets and data. If you've ever run the standalone server
directly (`node .next/standalone/server.js`), delete `.next/` before packaging.
