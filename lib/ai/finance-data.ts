import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { getMonthRange, isMonthKey, monthsBetween } from "@/lib/date";
import { db } from "@/lib/db";
import {
	accounts,
	categories,
	category_group,
	monthly_budgets,
	transactions,
} from "@/lib/db/schema";
import { fromCents } from "@/lib/money";

export const pkr = (cents: number) => Math.round(fromCents(cents) * 100) / 100;

const spentExpr = sql<number>`coalesce(sum(coalesce(${transactions.payment},0) - coalesce(${transactions.deposit},0)), 0)`;

const reportableTransactions = (from: string, to: string) =>
	and(
		gte(transactions.date, from),
		lt(transactions.date, to),
		eq(accounts.account_type, "on_budget"),
		eq(transactions.status, "cleared"),
		isNull(transactions.transfer_id),
	);

export function addMonths(month: string, delta: number): string {
	const [year, m] = month.split("-").map(Number);
	const date = new Date(year, m - 1 + delta, 1);
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export interface CategorySpending {
	category: string;
	group: string | null;
	isIncome: boolean;
	spent: number;
}

export function getCategorySpending(
	from: string,
	to: string,
): CategorySpending[] {
	return db
		.select({
			category: sql<string>`coalesce(${categories.name}, 'Uncategorized')`,
			group: category_group.name,
			isIncome: sql<number>`coalesce(${category_group.is_income}, 0)`,
			spent: spentExpr,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.leftJoin(categories, eq(transactions.category_id, categories.id))
		.leftJoin(category_group, eq(categories.group_id, category_group.id))
		.where(reportableTransactions(from, to))
		.groupBy(transactions.category_id)
		.all()
		.map((row) => ({
			...row,
			isIncome: Boolean(row.isIncome),
			spent: Number(row.spent) || 0,
		}));
}

export interface MonthTotals {
	month: string;
	income: number;
	expense: number;
}

export function getMonthlyTotals(
	fromMonth: string,
	toMonth: string,
): MonthTotals[] {
	const months = monthsBetween(fromMonth, toMonth);
	if (months.length === 0) return [];
	const { start } = getMonthRange(months[0]);
	const { end } = getMonthRange(months[months.length - 1]);
	const rows = db
		.select({
			month: sql<string>`substr(${transactions.date}, 1, 7)`,
			income: sql<number>`coalesce(sum(${transactions.deposit}), 0)`,
			expense: sql<number>`coalesce(sum(${transactions.payment}), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(reportableTransactions(start, end))
		.groupBy(sql`substr(${transactions.date}, 1, 7)`)
		.all();
	const byMonth = new Map(rows.map((row) => [row.month, row]));
	return months.map((month) => ({
		month,
		income: Number(byMonth.get(month)?.income) || 0,
		expense: Number(byMonth.get(month)?.expense) || 0,
	}));
}

export interface CategoryRef {
	id: string;
	name: string;
	group: string | null;
	isIncome: boolean;
}

export function resolveCategory(nameOrId: string): CategoryRef | null {
	const value = nameOrId.trim();
	const row = db
		.select({
			id: categories.id,
			name: categories.name,
			group: category_group.name,
			isIncome: sql<number>`coalesce(${category_group.is_income}, 0)`,
		})
		.from(categories)
		.leftJoin(category_group, eq(categories.group_id, category_group.id))
		.where(
			sql`${categories.id} = ${value} OR lower(${categories.name}) = lower(${value})`,
		)
		.orderBy(
			sql`CASE WHEN ${categories.id} = ${value} OR ${categories.name} = ${value} THEN 0 ELSE 1 END`,
		)
		.get();
	return row ? { ...row, isIncome: Boolean(row.isIncome) } : null;
}

export interface CategoryMonth {
	month: string;
	budgeted: number;
	spent: number;
}

export function getCategoryTrend(
	categoryId: string,
	fromMonth: string,
	toMonth: string,
): CategoryMonth[] {
	if (!isMonthKey(fromMonth) || !isMonthKey(toMonth)) return [];
	const months = monthsBetween(fromMonth, toMonth);
	const { start } = getMonthRange(fromMonth);
	const { end } = getMonthRange(toMonth);

	const spentRows = db
		.select({
			month: sql<string>`substr(${transactions.date}, 1, 7)`,
			spent: spentExpr,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(
			and(
				eq(transactions.category_id, categoryId),
				reportableTransactions(start, end),
			),
		)
		.groupBy(sql`substr(${transactions.date}, 1, 7)`)
		.all();
	const budgetRows = db
		.select({ month: monthly_budgets.month, amount: monthly_budgets.amount })
		.from(monthly_budgets)
		.where(
			and(
				eq(monthly_budgets.category_id, categoryId),
				gte(monthly_budgets.month, fromMonth),
				sql`${monthly_budgets.month} <= ${toMonth}`,
			),
		)
		.all();

	const spent = new Map(spentRows.map((row) => [row.month, Number(row.spent)]));
	const budgeted = new Map(budgetRows.map((row) => [row.month, row.amount]));
	return months.map((month) => ({
		month,
		budgeted: budgeted.get(month) ?? 0,
		spent: spent.get(month) ?? 0,
	}));
}
