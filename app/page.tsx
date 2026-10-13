import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight, Landmark, Wallet } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import CashFlowChart from "@/components/dashboard/cash-flow-chart";
import ChartCard from "@/components/dashboard/chart-card";
import GoalsCard from "@/components/dashboard/goals-card";
import NetWorthChart from "@/components/dashboard/net-worth-chart";
import RecentTransactions from "@/components/dashboard/recent-transactions";
import SpendingByGroupChart from "@/components/dashboard/spending-by-group-chart";
import StatCard from "@/components/dashboard/stat-card";
import { Money } from "@/components/money";
import PageContainer from "@/components/page-container";
import { getAccounts } from "@/lib/account";
import { getBudgetView } from "@/lib/budget";
import {
	getCashFlow,
	getNetWorthTrend,
	getSpendingByGroup,
} from "@/lib/dashboard";
import { getMonthKey, getMonthRange } from "@/lib/date";
import { getGoals } from "@/lib/goal";
import { getSummary } from "@/lib/summary";
import { getTransactions } from "@/lib/transaction";

export const metadata: Metadata = {
	title: "Dashboard · Personal Finance",
	description: "Personal finance overview",
};

const sumBalances = (accounts: Account[]) =>
	accounts.reduce((sum, a) => sum + a.balance, 0);

export default async function DashboardPage() {
	await connection();
	const month = getMonthKey();
	const monthName = format(new Date(), "MMMM");
	const { start, end } = getMonthRange(month);
	const accounts = getAccounts();
	const summary = getSummary(start, end);
	const budget = getBudgetView(month);
	const { data: recentTransactions } = getTransactions({ limit: "10" });
	const goals = getGoals()
		.filter((goal) => !goal.achievedAt)
		.slice(0, 4);

	const onBudget = sumBalances(
		accounts.filter((a) => a.account_type === "on_budget"),
	);
	const offBudget = sumBalances(
		accounts.filter((a) => a.account_type === "off_budget"),
	);
	const net = summary.income - summary.expense;

	return (
		<PageContainer className="gap-4">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					label="Net worth"
					value={onBudget + offBudget}
					icon={Landmark}
					footer={
						<>
							On budget <Money value={onBudget} /> · Off budget{" "}
							<Money value={offBudget} />
						</>
					}
				/>
				<StatCard
					label="To budget"
					value={budget.toBudget}
					icon={Wallet}
					href="/budget"
					valueClassName={
						budget.toBudget < 0 ? "text-destructive" : "text-emerald-500"
					}
					footer={
						budget.toBudget < 0 ? (
							"Overbudgeted, move money to cover it"
						) : (
							<>
								Budgeted <Money value={budget.budgeted} /> in {monthName}
							</>
						)
					}
				/>
				<StatCard
					label={`Income · ${monthName}`}
					value={summary.income}
					icon={ArrowDownLeft}
					footer={
						<>
							Net {net >= 0 && "+"}
							<Money value={net} /> this month
						</>
					}
				/>
				<StatCard
					label={`Spent · ${monthName}`}
					value={summary.expense}
					icon={ArrowUpRight}
					footer={
						summary.income > 0
							? `${Math.round((summary.expense / summary.income) * 100)}% of income`
							: "No income yet this month"
					}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
				<ChartCard
					title="Cash flow"
					description="Income vs spent, last 6 months"
				>
					<CashFlowChart data={getCashFlow()} />
				</ChartCard>
				<ChartCard title="Net worth" description="All accounts, last 12 months">
					<NetWorthChart data={getNetWorthTrend()} />
				</ChartCard>
				<ChartCard
					title="Spending by group"
					description={`Where your money went in ${monthName}`}
				>
					<SpendingByGroupChart data={getSpendingByGroup(budget)} />
				</ChartCard>
			</div>

			<RecentTransactions transactions={recentTransactions} />

			{goals.length > 0 && <GoalsCard goals={goals} />}
		</PageContainer>
	);
}
