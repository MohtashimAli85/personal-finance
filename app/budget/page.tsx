import type { Metadata } from "next";
import BudgetTable from "@/app/budget/budget-table";
import MonthPicker from "@/app/budget/month-picker";
import ToBudgetSummary from "@/components/budget/to-budget-summary";
import BudgetProvider from "@/context/budget-context";
import { getBudgetView } from "@/lib/budget";
import { getMonthKey, isMonthKey } from "@/lib/date";

export const metadata: Metadata = {
	title: "Budget - Personal Finance",
	description: "Envelope-style monthly budget",
};

export default async function BudgetPage(props: SearchPageProps) {
	const searchParams = await props.searchParams;
	const monthParam = searchParams.month;
	const month =
		monthParam && isMonthKey(monthParam) ? monthParam : getMonthKey();
	const budget = getBudgetView(month);
	return (
		<div className="flex min-h-0 flex-1 flex-col space-y-4 overflow-hidden">
			<div className="flex justify-center">
				<MonthPicker key={month} month={month} />
			</div>
			<ToBudgetSummary key={`${month}:${budget.toBudget}`} view={budget} />
			<BudgetProvider
				month={month}
				groups={budget.groups}
				totals={{
					budgeted: budget.budgeted,
					spent: budget.spent,
					balance: budget.balance,
				}}
				incomeGroup={budget.incomeGroup}
			>
				<BudgetTable />
			</BudgetProvider>
		</div>
	);
}
