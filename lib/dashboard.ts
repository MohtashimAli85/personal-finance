import { addDays, addMonths, format, subDays } from "date-fns";
import { sql } from "drizzle-orm";
import { getMonthKey, getMonthRange, toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { getSummary } from "@/lib/summary";

export interface MonthPoint {
	month: string;
	label: string;
}

const lastMonths = (count: number): MonthPoint[] =>
	Array.from({ length: count }, (_, i) => {
		const date = addMonths(new Date(), i - count + 1);
		return { month: getMonthKey(date), label: format(date, "MMM") };
	});

export function getCashFlow(count = 6) {
	return lastMonths(count).map((point) => {
		const { start, end } = getMonthRange(point.month);
		const { income, expense } = getSummary(start, end);
		return { ...point, income, spent: expense };
	});
}

export function getDailySpend(now = new Date()) {
	const today = toDateKey(now);
	const tomorrow = toDateKey(addDays(now, 1));
	const yesterday = toDateKey(subDays(now, 1));
	const { start } = getMonthRange(getMonthKey(now));
	const monthToDate = getSummary(start, tomorrow).expense;

	return {
		today: getSummary(today, tomorrow).expense,
		yesterday: getSummary(yesterday, today).expense,
		average: Math.round(monthToDate / now.getDate() / 100) * 100,
	};
}

export function getNetWorthTrend(count = 12) {
	const months = lastMonths(count);
	const rows = db
		.select({
			month: sql<string>`substr(${transactions.date}, 1, 7)`,
			change: sql<number>`coalesce(sum(coalesce(${transactions.deposit}, 0) - coalesce(${transactions.payment}, 0)), 0)`,
		})
		.from(transactions)
		.groupBy(sql`1`)
		.all();

	return months.map((point) => ({
		...point,
		netWorth: rows
			.filter((row) => row.month <= point.month)
			.reduce((sum, row) => sum + Number(row.change), 0),
	}));
}

export function getSpendingByGroup(view: BudgetView) {
	return view.groups
		.map((group) => ({
			name: group.name,
			spent: -group.categories.reduce((sum, c) => sum + c.spent, 0),
		}))
		.filter((group) => group.spent > 0)
		.sort((a, b) => b.spent - a.spent);
}

const budgetCategories = (view: BudgetView) =>
	view.groups.flatMap((group) => group.categories);

export function getHouseSpend(view: BudgetView, excluded: string[]) {
	const skip = new Set(excluded);
	return -budgetCategories(view)
		.filter((category) => !skip.has(category.id))
		.reduce((sum, category) => sum + category.spent, 0);
}

export function getOverspent(view: BudgetView) {
	const over = budgetCategories(view)
		.filter((category) => category.balance < 0)
		.sort((a, b) => a.balance - b.balance);
	return {
		total: -over.reduce((sum, category) => sum + category.balance, 0),
		count: over.length,
		worst: over[0] ?? null,
	};
}
