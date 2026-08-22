# V1 Plan – Codebase Patterns and File Map

Use this together with the main 7-day plan. It spells out **how** to implement so the codebase stays consistent.

---

## Codebase Patterns (Must Follow)

### Data fetch → API routes only

- All **reads** go through **API routes** under `app/api/*` (e.g. `GET` handlers).
- Pages and components get data via [lib/services.ts](lib/services.ts), which uses [lib/helper.ts](lib/helper.ts) `fetchData()` to call those API routes.
- **Do not** read from the DB directly in server components; use the same pattern as `fetchAccounts()`, `fetchTransactions()`, `fetchCategories()`.

### Mutations → Server actions only

- All **creates/updates/deletes** live in `app/actions/*` with `"use server"` (e.g. [app/actions/accounts/mutations.ts](app/actions/accounts/mutations.ts), [app/actions/transaction/mutations.ts](app/actions/transaction/mutations.ts), [app/actions/category/mutations.ts](app/actions/category/mutations.ts)).
- Server actions use `db` from [app/actions/database.ts](app/actions/database.ts), then `revalidatePath()` and/or `updateTag()` for cache.

### Helpers and DRY

- **lib/helper.ts:** Shared utilities – `formatCurrency`, `safeParseFloat`, `fetchData`. Add any new shared helpers here (e.g. month string for budget).
- **lib/date.ts:** Date formatting/parsing. Extend with month helpers if needed (e.g. `getMonthKey(date)`, `getMonthStartEnd(month)`) so one place owns date logic.
- **Thin API routes:** Put query/aggregation logic in a **query module** (e.g. `app/api/budget/query.ts`) that the route imports and calls. Reuse that module or shared helpers so the same grouping/aggregation is not duplicated (e.g. budget and categories both need grouped categories – extract shared logic once).
- **lib/services.ts:** Single place for fetch wrappers that call the API via `fetchData`. Add `fetchBudget(month)` and, if needed, `fetchSummary(from, to)` here.

---

## Files to Add or Touch (Aligned with Patterns)

| Area | Action |
|------|--------|
| **app/actions/database.ts** | Add `monthly_budgets` table. |
| **app/api/budget/query.ts** | New. Budget query logic: total balances, sum budgeted per month, activity per category (sum payment in month), grouped categories with budgeted/activity/balance. Reuse grouping pattern from categories API where possible (DRY). |
| **app/api/budget/route.ts** | New. GET with `month` query param; call query module; return `{ toBudget, groups }`. Thin route. |
| **app/actions/budget/mutations.ts** | New. `"use server"`. `setBudgetedAmount(categoryId, month, amount)` – upsert `monthly_budgets`; `revalidatePath("/budget")` and `updateTag("budget")`. |
| **lib/services.ts** | Add `fetchBudget(month)` using `fetchData("budget", { month })`. If dashboard needs period totals, add `fetchSummary(from?, to?)` calling a new API route. |
| **lib/helper.ts** | Add any shared helpers (e.g. `getMonthKey(date)` for YYYY-MM) if not in lib/date.ts. |
| **lib/date.ts** | Add month helpers if needed: `getMonthKey(date)`, `getMonthStartEnd(month)` for budget and dashboard. |
| **global.d.ts** | Add types for budget API response (e.g. `BudgetCategoryRow`, `BudgetGroup`, `BudgetView`). |
| **app/budget/page.tsx** (+ client) | New. Fetch via `fetchBudget(month)` from services; render To Budget, groups, Budgeted/Activity/Balance; Day 3: inline edit calls `setBudgetedAmount`. |
| **app/transactions/[accountId]/page.tsx** | Call `notFound()` when account is null. |
| **app/transactions/[accountId]/not-found.tsx** | New. Simple message + link to home/transactions. |
| **app/categories/page.tsx** | New. Data from `fetchCategories()` (API); CRUD via [app/actions/category/mutations.ts](app/actions/category/mutations.ts). |
| **app/page.tsx** / **app/page.client.tsx** | Dashboard: net worth from `fetchAccounts()`; period income/expense and recent transactions from `fetchTransactions({ from, to, limit })` or new `fetchSummary` API if you add it; remove Meezan from V1. |
| **app/api/summary/route.ts** (optional) | New. GET with `from`, `to`; return `{ income, expense }` (sum deposit, sum payment). Keeps dashboard DRY if you don’t want to sum in client. |
| **components/sidebar/app-sidebar.tsx** | Nav links: Dashboard (/), Budget (/budget), Transactions (/transactions), Categories (/categories); keep existing accounts list. |
| **README.md** | V1 description, run, DB, features. |

---

## Checklist So Nothing Is Missed

- [ ] All **reads** use an API route and (where used by app) a wrapper in **lib/services.ts** via **fetchData**.
- [ ] All **writes** use a server action in **app/actions/** with **revalidatePath** / **updateTag**.
- [ ] No duplicate grouping/aggregation: budget and categories share logic (e.g. one place that returns grouped categories; budget adds budgeted/activity/balance).
- [ ] Date/month logic lives in **lib/date.ts** or **lib/helper.ts** (one place).
- [ ] **global.d.ts** has types for any new API response shapes (budget, summary if added).
- [ ] Account not-found handled; Meezan removed or hidden from V1 flow.
