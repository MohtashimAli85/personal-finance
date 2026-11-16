import type { Metadata } from "next";
import { cookies } from "next/headers";
import BudgetTable from "@/app/budget/budget-table";
import MonthPicker from "@/app/budget/month-picker";
import BudgetTableMenu from "@/components/budget/budget-table-menu";
import ToBudgetSummary from "@/components/budget/to-budget-summary";
import PageHeader from "@/components/page-header";
import BudgetProvider from "@/context/budget-context";
import { getBudgetView } from "@/lib/budget";
import { applyRecurringBudgets } from "@/lib/budget-mutations";
import {
	COLLAPSED_COOKIE,
	parseCollapsed,
	SHOW_HIDDEN_COOKIE,
} from "@/lib/budget-view-prefs";
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
	if (month === getMonthKey()) applyRecurringBudgets(month);
	const budget = getBudgetView(month);
	const cookieStore = await cookies();
	return (
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
			initialShowHidden={cookieStore.get(SHOW_HIDDEN_COOKIE)?.value === "1"}
			initialCollapsed={parseCollapsed(
				cookieStore.get(COLLAPSED_COOKIE)?.value,
			)}
		>
			<div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4 overflow-hidden">
				<PageHeader title="Budget">
					<ToBudgetSummary key={`${month}:${budget.toBudget}`} view={budget} />
					<MonthPicker key={month} month={month} />
					<BudgetTableMenu />
				</PageHeader>
				<BudgetTable />
			</div>
		</BudgetProvider>
	);
}
