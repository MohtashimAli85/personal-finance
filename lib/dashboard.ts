import { addMonths, format } from "date-fns";
import { sql } from "drizzle-orm";
import { getMonthKey, getMonthRange } from "@/lib/date";
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
