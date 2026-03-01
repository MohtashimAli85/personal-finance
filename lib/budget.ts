import { cache } from "react";
import db from "@/app/actions/database";
import { getGroupedCategories } from "@/lib/category";
import { getMonthRange, isMonthKey } from "@/lib/date";

type BudgetAmountRow = {
	category_id: string;
	amount: number;
};

type ActivityRow = {
	category_id: string;
	activity: number;
};

export const getBudgetView = cache((month: string): BudgetView => {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}

	const groups = getGroupedCategories();
	const { start, end } = getMonthRange(month);

	const totalBalance =
		(
			db
				.prepare(
					"SELECT COALESCE(SUM(balance), 0) AS total FROM accounts WHERE account_type = 'on_budget'",
				)
				.get() as { total: number }
		).total ?? 0;

	const budgetRows = db
		.prepare("SELECT category_id, amount FROM monthly_budgets WHERE month = ?")
		.all(month) as BudgetAmountRow[];

	const activityRows = db
		.prepare(
			`
      SELECT
        t.category_id,
        COALESCE(SUM(t.payment), 0) AS activity
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      WHERE t.category_id IS NOT NULL
        AND a.account_type = 'on_budget'
        AND t.date >= ?
        AND t.date < ?
      GROUP BY t.category_id
    `,
		)
		.all(start, end) as ActivityRow[];

	const budgetMap = new Map<string, number>(
		budgetRows.map((row) => [row.category_id, Number(row.amount) || 0]),
	);
	const activityMap = new Map<string, number>(
		activityRows.map((row) => [row.category_id, Number(row.activity) || 0]),
	);

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
