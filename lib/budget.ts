import { and, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { cache } from "react";
import { getGroupedCategories } from "@/lib/category";
import { getMonthRange, isMonthKey } from "@/lib/date";
import { db } from "@/lib/db";
import { accounts, monthly_budgets, transactions } from "@/lib/db/schema";

/**
 * Envelope-budgeting math. All amounts are integer cents.
 *
 * Every category's "available" balance is cumulative: everything assigned to
 * it up to and including the viewed month, minus everything spent from it up
 * to and including the viewed month. An unspent surplus therefore carries
 * forward for free, and an overspent category carries its negative forward -
 * this is the defining behavior of envelope budgeting, and the reason a
 * single month's `budgeted - activity` is not enough.
 *
 * "To Budget" (ready to assign) is all on-budget cash minus every assignment
 * ever made up to and including the viewed month - not just this month's
 * assignments, which would re-offer money already assigned in a past month.
 */
export const getBudgetView = cache((month: string): BudgetView => {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}

	const allGroups = getGroupedCategories();
	// Income-group categories are for tagging income transactions, not for
	// assigning budget money to - they never appear as budgetable envelopes.
	const groups = allGroups.filter((g) => !g.is_income);
	const { end: monthEndExclusive } = getMonthRange(month);

	const totalBalance =
		db
			.select({
				total: sql<number>`coalesce(sum(${accounts.balance}), 0)`,
			})
			.from(accounts)
			.where(
				and(eq(accounts.account_type, "on_budget"), isNull(accounts.closed_at)),
			)
			.get()?.total ?? 0;

	// Cumulative assignment per category, through the viewed month.
	const assignedRows = db
		.select({
			category_id: monthly_budgets.category_id,
			assigned: sql<number>`coalesce(sum(${monthly_budgets.amount}), 0)`,
		})
		.from(monthly_budgets)
		.where(lte(monthly_budgets.month, month))
		.groupBy(monthly_budgets.category_id)
		.all();

	// This month's assignment only, for the "Budgeted" column.
	const budgetedThisMonthRows = db
		.select({
			category_id: monthly_budgets.category_id,
			amount: monthly_budgets.amount,
		})
		.from(monthly_budgets)
		.where(eq(monthly_budgets.month, month))
		.all();

	// Cumulative activity per category, through the viewed month. Net of
	// deposits (refunds) against payments, cleared on-budget transactions only.
	const activityRows = db
		.select({
			category_id: transactions.category_id,
			activity: sql<number>`coalesce(sum(coalesce(${transactions.payment},0) - coalesce(${transactions.deposit},0)), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(
			and(
				isNotNull(transactions.category_id),
				eq(accounts.account_type, "on_budget"),
				eq(transactions.status, "cleared"),
				sql`${transactions.date} < ${monthEndExclusive}`,
			),
		)
		.groupBy(transactions.category_id)
		.all();

	// This month's uncategorized on-budget spending - not part of any
	// envelope, surfaced so it isn't an invisible drain on "To Budget".
	const uncategorizedActivity =
		db
			.select({
				total: sql<number>`coalesce(sum(coalesce(${transactions.payment},0) - coalesce(${transactions.deposit},0)), 0)`,
			})
			.from(transactions)
			.innerJoin(accounts, eq(transactions.account_id, accounts.id))
			.where(
				and(
					isNull(transactions.category_id),
					eq(accounts.account_type, "on_budget"),
					eq(transactions.status, "cleared"),
					sql`${transactions.date} >= ${getMonthRange(month).start}`,
					sql`${transactions.date} < ${monthEndExclusive}`,
				),
			)
			.get()?.total ?? 0;

	const assignedMap = new Map(
		assignedRows.map((r) => [r.category_id, Number(r.assigned) || 0]),
	);
	const budgetedThisMonthMap = new Map(
		budgetedThisMonthRows.map((r) => [r.category_id, Number(r.amount) || 0]),
	);
	const activityMap = new Map<string, number>();
	for (const row of activityRows) {
		if (row.category_id == null) continue;
		activityMap.set(row.category_id, Number(row.activity) || 0);
	}

	let totalAssignedAllTime = 0;
	const budgetGroups: BudgetGroup[] = groups.map((group) => ({
		id: group.id,
		name: group.name,
		sort_order: group.sort_order ?? 9998,
		is_income: false,
		can_delete: group.categories.length === 0,
		categories: group.categories.map((category) => {
			const budgeted = budgetedThisMonthMap.get(category.id) ?? 0;
			const assignedThroughMonth = assignedMap.get(category.id) ?? 0;
			const activity = activityMap.get(category.id) ?? 0;
			totalAssignedAllTime += assignedThroughMonth;
			return {
				id: category.id,
				name: category.name,
				group_id: category.group_id,
				budgeted,
				activity,
				available: assignedThroughMonth - activity,
			};
		}),
	}));

	return {
		month,
		totalBalance,
		totalAssignedAllTime,
		toBudget: totalBalance - totalAssignedAllTime,
		uncategorizedActivity,
		groups: budgetGroups,
	};
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
				})
				.run();
			copied += 1;
		}
	});
	return copied;
}
