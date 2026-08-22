import { and, eq, gte, isNotNull, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { getGroupedCategories } from "@/lib/category";
import { getMonthRange, isMonthKey } from "@/lib/date";
import { db } from "@/lib/db";
import { accounts, monthly_budgets, transactions } from "@/lib/db/schema";

export const getBudgetView = cache((month: string): BudgetView => {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}

	const groups = getGroupedCategories();
	const { start, end } = getMonthRange(month);

	const totalBalance =
		db
			.select({
				total: sql<number>`coalesce(sum(${accounts.balance}), 0)`,
			})
			.from(accounts)
			.where(eq(accounts.account_type, "on_budget"))
			.get()?.total ?? 0;

	const budgetRows = db
		.select({
			category_id: monthly_budgets.category_id,
			amount: monthly_budgets.amount,
		})
		.from(monthly_budgets)
		.where(eq(monthly_budgets.month, month))
		.all();

	const activityRows = db
		.select({
			category_id: transactions.category_id,
			activity: sql<number>`coalesce(sum(${transactions.payment}), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(
			and(
				isNotNull(transactions.category_id),
				eq(accounts.account_type, "on_budget"),
				gte(transactions.date, start),
				lt(transactions.date, end),
			),
		)
		.groupBy(transactions.category_id)
		.all();

	const budgetMap = new Map<string, number>(
		budgetRows.map((row) => [row.category_id, Number(row.amount) || 0]),
	);
	const activityMap = new Map<string, number>();
	for (const row of activityRows) {
		if (row.category_id == null) continue;
		activityMap.set(row.category_id, Number(row.activity) || 0);
	}

	const budgetGroups = groups.map((group) => ({
		id: group.id,
		name: group.name,
		sort_order: group.sort_order ?? 9998,
		is_income: group.is_income ?? false,
		can_delete: !(group.is_income ?? false) && group.categories.length === 0,
		categories: group.categories.map((category) => {
			const budgeted = budgetMap.get(category.id) ?? 0;
			const activity = activityMap.get(category.id) ?? 0;
			return {
				id: category.id,
				name: category.name,
				group_id: category.group_id,
				budgeted,
				activity,
				balance: budgeted - activity,
			};
		}),
	}));

	const totalBudgeted = budgetGroups.reduce(
		(sum, group) =>
			sum +
			group.categories.reduce(
				(catSum, category) => catSum + category.budgeted,
				0,
			),
		0,
	);

	return {
		month,
		totalBalance,
		totalBudgeted,
		toBudget: totalBalance - totalBudgeted,
		groups: budgetGroups,
	};
});
