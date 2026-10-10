export function groupTotals(categories: BudgetCategoryRow[]) {
	return categories.reduce(
		(sum, c) => ({
			budgeted: sum.budgeted + c.budgeted,
			spent: sum.spent + c.spent,
			balance: sum.balance + c.balance,
		}),
		{ budgeted: 0, spent: 0, balance: 0 },
	);
}
