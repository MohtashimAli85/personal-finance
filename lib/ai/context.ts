import { format } from "date-fns";
import { getAccounts } from "@/lib/account";
import { getBudgetView } from "@/lib/budget";
import { getMonthKey, getMonthRange } from "@/lib/date";
import { getGoals } from "@/lib/goal";
import { fromCents } from "@/lib/money";
import {
	addMonths,
	getCategorySpending,
	getMonthlyTotals,
} from "./finance-data";

export const CURRENCY = "PKR";

const money = (cents: number) =>
	Math.round(fromCents(cents)).toLocaleString("en-US");

export function buildFinanceSnapshot(now: Date = new Date()): string {
	const month = getMonthKey(now);
	const lines: string[] = [];

	lines.push(
		`Today: ${format(now, "yyyy-MM-dd (EEEE)")}. Current month: ${month}. Currency: ${CURRENCY}.`,
	);

	const accounts = getAccounts();
	const netWorth = accounts.reduce((sum, a) => sum + a.balance, 0);
	lines.push("", "ACCOUNTS (open):");
	for (const account of accounts) {
		const type =
			account.account_type === "off_budget" ? "off-budget" : "on-budget";
		lines.push(`- ${account.name} (${type}): ${money(account.balance)}`);
	}
	lines.push(`Net worth: ${money(netWorth)}`);

	const budget = getBudgetView(month);
	lines.push(
		"",
		`BUDGET ${month}:`,
		`To budget (unassigned cash): ${money(budget.toBudget)}`,
		`= available funds ${money(budget.availableFunds)} (income ${money(budget.income)} + left from last month ${money(budget.fromLastMonth)}) - overspent last month ${money(-budget.lastMonthOverspent)} - budgeted ${money(budget.budgeted)} - held for next month ${money(budget.buffered)}`,
	);
	if (budget.uncategorizedActivity) {
		lines.push(
			`Uncategorized spending this month: ${money(budget.uncategorizedActivity)}`,
		);
	}
	lines.push(
		"Category | budgeted this month | spent this month | balance (rollover)",
	);
	for (const group of budget.groups) {
		const rows = group.categories.filter(
			(c) => c.budgeted || c.spent || c.balance,
		);
		if (rows.length === 0) continue;
		lines.push(`[${group.name}]`);
		for (const c of rows) {
			lines.push(
				`- ${c.name} | ${money(c.budgeted)} | ${money(-c.spent)} | ${money(c.balance)}${c.carryover ? " (rolls over overspending)" : ""}`,
			);
		}
	}
	const emptyCategories = budget.groups
		.flatMap((g) => g.categories)
		.filter((c) => !c.budgeted && !c.spent && !c.balance)
		.map((c) => c.name);
	if (emptyCategories.length) {
		lines.push(`Unused categories: ${emptyCategories.join(", ")}`);
	}

	const lastMonth = addMonths(month, -1);
	const firstMonth = addMonths(month, -3);
	const totals = getMonthlyTotals(firstMonth, lastMonth);
	const activeMonths = totals.filter((t) => t.income || t.expense);
	if (activeMonths.length) {
		const avgIncome =
			activeMonths.reduce((sum, t) => sum + t.income, 0) / activeMonths.length;
		const avgExpense =
			activeMonths.reduce((sum, t) => sum + t.expense, 0) / activeMonths.length;
		lines.push(
			"",
			`LAST ${totals.length} FULL MONTHS (${firstMonth} to ${lastMonth}):`,
		);
		for (const t of totals) {
			lines.push(
				`- ${t.month}: income ${money(t.income)}, spending ${money(t.expense)}, net ${money(t.income - t.expense)}`,
			);
		}
		lines.push(
			`Average: income ${money(avgIncome)}, spending ${money(avgExpense)}, saved ${money(avgIncome - avgExpense)} per month`,
		);

		const { start } = getMonthRange(firstMonth);
		const { end } = getMonthRange(lastMonth);
		const top = getCategorySpending(start, end)
			.filter((row) => !row.isIncome && row.spent > 0)
			.sort((a, b) => b.spent - a.spent)
			.slice(0, 12);
		if (top.length) {
			lines.push("Top spending categories (monthly average):");
			for (const row of top) {
				lines.push(
					`- ${row.category}: ${money(row.spent / activeMonths.length)}`,
				);
			}
		}
	}

	const goals = getGoals({ month, budget });
	lines.push("", "SAVINGS GOALS:");
	if (goals.length === 0) {
		lines.push("None yet.");
	}
	for (const goal of goals) {
		const deadline = goal.targetMonth
			? `by ${goal.targetMonth}`
			: "no deadline";
		const perMonth =
			goal.requiredPerMonth !== null
				? `, needs ${money(goal.requiredPerMonth)}/month over ${goal.monthsLeft} months`
				: "";
		lines.push(
			`- [id ${goal.id}] ${goal.name}: saved ${money(goal.saved)} of ${money(goal.targetAmount)} (${Math.round(goal.percent)}%), ${deadline}${perMonth}, budgeted ${money(goal.budgetedThisMonth)} this month, status ${goal.status}${goal.achievedAt ? " (marked achieved)" : ""}`,
		);
	}

	return lines.join("\n");
}
