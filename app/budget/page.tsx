import type { Metadata } from "next";
import BudgetTable from "@/app/budget/budget-table";
import MonthPicker from "@/app/budget/month-picker";
import ToBudgetSummary from "@/components/budget/to-budget-summary";
import BudgetProvider from "@/context/budget-context";
import { getBudgetView } from "@/lib/budget";
import { getMonthKey, isMonthKey } from "@/lib/date";

export const metadata: Metadata = {
	title: "Budget",
	description: "Envelope-style monthly budget",
};

export default async function BudgetPage(props: SearchPageProps) {
	const searchParams = await props.searchParams;
	const monthParam = searchParams.month;
	const month =
		monthParam && isMonthKey(monthParam) ? monthParam : getMonthKey();
	const budget = getBudgetView(month);
	return (
		<div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 overflow-hidden">
			<div className="flex justify-center">
				<MonthPicker key={month} month={month} />
			</div>
			<div className="mx-auto w-full max-w-sm">
				<ToBudgetSummary key={`${month}:${budget.toBudget}`} view={budget} />
			</div>
			<BudgetProvider
				month={month}
				groups={budget.groups}
				totals={{
					budgeted: budget.budgeted,
					spent: budget.spent,
					balance: budget.balance,
				}}
				toBudget={budget.toBudget}
				incomeGroup={budget.incomeGroup}
			>
				<BudgetTable />
			</BudgetProvider>
		</div>
	);
}
