import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { getGroupedCategories } from "@/lib/category";
import { getMonthRange, isMonthKey, monthsBetween } from "@/lib/date";
import { db } from "@/lib/db";
import {
	accounts,
	budget_months,
	monthly_budgets,
	transactions,
} from "@/lib/db/schema";

interface BudgetCell {
	amount: number;
	carryover: boolean;
}

interface Ledger {
	firstMonth: string | null;
	spent: Map<string, number>;
	budgets: Map<string, BudgetCell>;
	buffered: Map<string, number>;
}

const cellKey = (month: string, categoryId: string) => `${month}|${categoryId}`;

function loadLedger(): Ledger {
	const spentRows = db
		.select({
			month: sql<string>`substr(${transactions.date}, 1, 7)`,
			categoryId: transactions.category_id,
			amount: sql<number>`coalesce(sum(coalesce(${transactions.deposit},0) - coalesce(${transactions.payment},0)), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(
			and(
				isNotNull(transactions.category_id),
				eq(accounts.account_type, "on_budget"),
			),
		)
		.groupBy(sql`substr(${transactions.date}, 1, 7)`, transactions.category_id)
		.all();
	const budgetRows = db.select().from(monthly_budgets).all();
	const bufferedRows = db.select().from(budget_months).all();

	const months = [
		...spentRows.map((row) => row.month),
		...budgetRows.map((row) => row.month),
	].sort();

	return {
		firstMonth: months[0] ?? null,
		spent: new Map(
			spentRows.map((row) => [
				cellKey(row.month, row.categoryId ?? ""),
				Number(row.amount) || 0,
			]),
		),
		budgets: new Map(
			budgetRows.map((row) => [
				cellKey(row.month, row.category_id),
				{ amount: row.amount, carryover: row.carryover },
			]),
		),
		buffered: new Map(bufferedRows.map((row) => [row.month, row.buffered])),
	};
}

function uncategorizedSpending(month: string): number {
	const { start, end } = getMonthRange(month);
	return (
		db
			.select({
				total: sql<number>`coalesce(sum(coalesce(${transactions.payment},0) - coalesce(${transactions.deposit},0)), 0)`,
			})
			.from(transactions)
			.innerJoin(accounts, eq(transactions.account_id, accounts.id))
			.where(
				and(
					isNull(transactions.category_id),
					isNull(transactions.transfer_id),
					eq(accounts.account_type, "on_budget"),
					sql`${transactions.date} >= ${start}`,
					sql`${transactions.date} < ${end}`,
				),
			)
			.get()?.total ?? 0
	);
}

/**
 * Actual Budget's envelope math (loot-core/src/server/budget/envelope.ts),
 * walked month by month from the first month with data:
 * - category balance = budgeted + spent + previous balance, where a negative
 *   previous balance only carries when that category had rollover enabled;
 * - otherwise overspending resets to 0 and is taken from the next month's
 *   To Budget ("overspent last month");
 * - To Budget = income + last month's To Budget and hold + last month's
 *   overspending - budgeted - held for next month.
 */
export const getBudgetView = cache((month: string): BudgetView => {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}

	const allGroups = getGroupedCategories();
	const expenseGroups = allGroups.filter((g) => !g.is_income);
	const expenseCategories = expenseGroups.flatMap((g) => g.categories);
	const incomeGroup = allGroups.find((g) => g.is_income) ?? null;
	const incomeCategories = incomeGroup?.categories ?? [];
	const ledger = loadLedger();

	const spentIn = (m: string, id: string) =>
		ledger.spent.get(cellKey(m, id)) ?? 0;
	const budgetIn = (m: string, id: string) =>
		ledger.budgets.get(cellKey(m, id));

	const firstMonth =
		ledger.firstMonth && ledger.firstMonth < month ? ledger.firstMonth : month;

	let prevBalance = new Map<string, number>();
	let prevCarryover = new Map<string, boolean>();
	let prevToBudget = 0;
	let prevBuffered = 0;
	let view: BudgetView | null = null;

	for (const m of monthsBetween(firstMonth, month)) {
		const income = incomeCategories.reduce(
			(sum, c) => sum + spentIn(m, c.id),
			0,
		);
		const lastMonthOverspent = expenseCategories.reduce((sum, c) => {
			const previous = prevBalance.get(c.id) ?? 0;
			return prevCarryover.get(c.id) ? sum : sum + Math.min(previous, 0);
		}, 0);

		const balance = new Map<string, number>();
		const carryover = new Map<string, boolean>();
		let budgeted = 0;
		for (const c of expenseCategories) {
			const cell = budgetIn(m, c.id);
			const previous = prevBalance.get(c.id) ?? 0;
			const carried = prevCarryover.get(c.id)
				? previous
				: Math.max(previous, 0);
			budgeted += cell?.amount ?? 0;
			balance.set(c.id, (cell?.amount ?? 0) + spentIn(m, c.id) + carried);
			carryover.set(c.id, cell?.carryover ?? false);
		}

		const buffered = ledger.buffered.get(m) ?? 0;
		const fromLastMonth = prevToBudget + prevBuffered;
		const availableFunds = income + fromLastMonth;
		const toBudget = availableFunds + lastMonthOverspent - budgeted - buffered;

		if (m === month) {
			const groups: BudgetGroup[] = expenseGroups.map((group) => ({
				id: group.id,
				name: group.name,
				sort_order: group.sort_order ?? 9998,
				is_income: false,
				hidden: group.hidden ?? false,
				can_delete: group.categories.length === 0,
				categories: group.categories.map((c) => ({
					id: c.id,
					name: c.name,
					group_id: c.group_id,
					hidden: c.hidden ?? false,
					budgeted: budgetIn(m, c.id)?.amount ?? 0,
					spent: spentIn(m, c.id),
					balance: balance.get(c.id) ?? 0,
					carryover: carryover.get(c.id) ?? false,
				})),
			}));
			view = {
				month,
				income,
				fromLastMonth,
				availableFunds,
				lastMonthOverspent,
				budgeted,
				buffered,
				toBudget,
				spent: expenseCategories.reduce((sum, c) => sum + spentIn(m, c.id), 0),
				balance: [...balance.values()].reduce((sum, v) => sum + v, 0),
				uncategorizedActivity: uncategorizedSpending(m),
				groups,
				incomeGroup: incomeGroup
					? {
							id: incomeGroup.id,
							name: incomeGroup.name,
							categories: incomeCategories.map((c) => ({
								id: c.id,
								name: c.name,
								hidden: c.hidden ?? false,
								received: spentIn(m, c.id),
							})),
						}
					: null,
			};
		}

		prevBalance = balance;
		prevCarryover = carryover;
		prevToBudget = toBudget;
		prevBuffered = buffered;
	}

	if (!view) throw new Error(`No budget computed for ${month}`);
	return view;
});

/** Copies every category's budgeted amount from `fromMonth` into `toMonth`,
 * skipping categories that already have an assignment in `toMonth`. */
export function copyBudgetFromMonth(
	fromMonth: string,
	toMonth: string,
): number {
	if (!isMonthKey(fromMonth) || !isMonthKey(toMonth)) {
		throw new Error("Invalid month key");
	}
	const source = db
		.select({
			category_id: monthly_budgets.category_id,
			amount: monthly_budgets.amount,
			carryover: monthly_budgets.carryover,
		})
		.from(monthly_budgets)
		.where(eq(monthly_budgets.month, fromMonth))
		.all();
	const existingTarget = new Set(
		db
			.select({ category_id: monthly_budgets.category_id })
			.from(monthly_budgets)
			.where(eq(monthly_budgets.month, toMonth))
			.all()
			.map((r) => r.category_id),
	);

	let copied = 0;
	db.transaction(() => {
		for (const row of source) {
			if (existingTarget.has(row.category_id) || row.amount === 0) continue;
			db.insert(monthly_budgets)
				.values({
					category_id: row.category_id,
					month: toMonth,
					amount: row.amount,
					carryover: row.carryover,
				})
				.run();
			copied += 1;
		}
	});
	return copied;
}
