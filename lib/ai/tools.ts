import { tool } from "ai";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { setBudgetedAmount } from "@/app/actions/budget/mutations";
import { getBudgetView } from "@/lib/budget";
import { getMonthKey, getMonthRange, isMonthKey } from "@/lib/date";
import {
	computeGoalProgress,
	createGoalRecord,
	GoalError,
	getGoals,
	updateGoalRecord,
} from "@/lib/goal";
import { toCents } from "@/lib/money";
import { getTransactions } from "@/lib/transaction";
import {
	addMonths,
	getCategorySpending,
	getCategoryTrend,
	getMonthlyTotals,
	pkr,
	resolveCategory,
} from "./finance-data";

const monthKey = z
	.string()
	.regex(/^\d{4}-(0[1-9]|1[0-2])$/)
	.describe("Month as YYYY-MM");
const dateKey = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.describe("Date as YYYY-MM-DD");
const amount = z.number().positive().describe("Amount in PKR (not paisa)");

const revalidateMoneyPages = () => {
	revalidatePath("/goals");
	revalidatePath("/budget");
	revalidatePath("/");
};

const goalSummary = (goal: ReturnType<typeof getGoals>[number]) => ({
	id: goal.id,
	name: goal.name,
	category: goal.categoryName,
	target: pkr(goal.targetAmount),
	targetMonth: goal.targetMonth,
	saved: pkr(goal.saved),
	remaining: pkr(goal.remaining),
	percent: Math.round(goal.percent),
	monthsLeft: goal.monthsLeft,
	requiredPerMonth:
		goal.requiredPerMonth === null ? null : pkr(goal.requiredPerMonth),
	budgetedThisMonth: pkr(goal.budgetedThisMonth),
	status: goal.status,
	achieved: Boolean(goal.achievedAt),
	notes: goal.notes,
});

export const readTools = {
	getBudgetMonth: tool({
		description:
			"Budget for one month: each category's budgeted amount, spending and cumulative available balance, plus unassigned 'to budget' cash.",
		inputSchema: z.object({ month: monthKey }),
		execute: async ({ month }) => {
			const view = getBudgetView(month);
			return {
				month,
				toBudget: pkr(view.toBudget),
				uncategorizedSpending: pkr(view.uncategorizedActivity),
				groups: view.groups.map((group) => ({
					group: group.name,
					categories: group.categories.map((c) => ({
						category: c.name,
						budgeted: pkr(c.budgeted),
						spent: pkr(c.spent),
						available: pkr(c.available),
					})),
				})),
			};
		},
	}),

	getSpending: tool({
		description:
			"Spending and income between two months (inclusive), either per month or per category. Excludes transfers and unreviewed imports.",
		inputSchema: z.object({
			fromMonth: monthKey,
			toMonth: monthKey,
			groupBy: z.enum(["month", "category"]),
		}),
		execute: async ({ fromMonth, toMonth, groupBy }) => {
			if (fromMonth > toMonth) return { error: "fromMonth is after toMonth" };
			if (groupBy === "month") {
				return {
					months: getMonthlyTotals(fromMonth, toMonth).map((t) => ({
						month: t.month,
						income: pkr(t.income),
						spending: pkr(t.expense),
						net: pkr(t.income - t.expense),
					})),
				};
			}
			const { start } = getMonthRange(fromMonth);
			const { end } = getMonthRange(toMonth);
			return {
				categories: getCategorySpending(start, end)
					.filter((row) => row.spent !== 0)
					.sort((a, b) => Math.abs(b.spent) - Math.abs(a.spent))
					.map((row) => ({
						category: row.category,
						group: row.group,
						type: row.isIncome ? "income" : "expense",
						amount: pkr(Math.abs(row.spent)),
					})),
			};
		},
	}),

	getCategoryTrend: tool({
		description:
			"Month-by-month budgeted vs spent for one category over the last N months (including the current month).",
		inputSchema: z.object({
			category: z.string().describe("Category name"),
			months: z.number().int().min(1).max(24).default(6),
		}),
		execute: async ({ category, months }) => {
			const ref = resolveCategory(category);
			if (!ref) return { error: `No category named "${category}"` };
			const toMonth = getMonthKey();
			const fromMonth = addMonths(toMonth, -(months - 1));
			return {
				category: ref.name,
				months: getCategoryTrend(ref.id, fromMonth, toMonth).map((m) => ({
					month: m.month,
					budgeted: pkr(m.budgeted),
					spent: pkr(m.spent),
				})),
			};
		},
	}),

	searchTransactions: tool({
		description:
			"Find individual transactions by text (notes, account or category), category and/or date range. Newest first.",
		inputSchema: z.object({
			query: z.string().optional(),
			category: z.string().optional().describe("Category name"),
			from: dateKey.optional().describe("Inclusive start date"),
			to: dateKey.optional().describe("Exclusive end date"),
			limit: z.number().int().min(1).max(50).default(20),
		}),
		execute: async ({ query, category, from, to, limit }) => {
			let categoryId: string | undefined;
			if (category) {
				const ref = resolveCategory(category);
				if (!ref) return { error: `No category named "${category}"` };
				categoryId = ref.id;
			}
			const { data, hasMore } = getTransactions({
				search: query,
				categoryId,
				from,
				to,
				limit: String(limit),
			});
			return {
				hasMore,
				transactions: data.map((t) => ({
					date: t.date,
					account: t.account_name,
					category: t.category_name ?? "Uncategorized",
					notes: t.notes,
					payment: t.payment ? pkr(t.payment) : null,
					deposit: t.deposit ? pkr(t.deposit) : null,
				})),
			};
		},
	}),

	getGoals: tool({
		description: "All savings goals with progress, including achieved ones.",
		inputSchema: z.object({}),
		execute: async () => ({
			goals: getGoals({ includeArchived: false }).map(goalSummary),
		}),
	}),

	simulateSavings: tool({
		description:
			"Savings math. Give monthlyAmount to get how many months a target takes, or targetMonth to get the amount needed per month. Starts counting from the current month.",
		inputSchema: z.object({
			targetAmount: amount,
			alreadySaved: z.number().min(0).default(0),
			monthlyAmount: amount.optional(),
			targetMonth: monthKey.optional(),
		}),
		execute: async ({
			targetAmount,
			alreadySaved,
			monthlyAmount,
			targetMonth,
		}) => {
			const remaining = Math.max(targetAmount - alreadySaved, 0);
			const currentMonth = getMonthKey();
			if (monthlyAmount) {
				const months = Math.ceil(remaining / monthlyAmount);
				return {
					remaining,
					monthsNeeded: months,
					reachedBy: addMonths(currentMonth, Math.max(months - 1, 0)),
				};
			}
			if (targetMonth) {
				if (!isMonthKey(targetMonth) || targetMonth < currentMonth) {
					return { error: "targetMonth must be this month or later" };
				}
				const progress = computeGoalProgress({
					targetAmount: toCents(targetAmount),
					available: toCents(alreadySaved),
					budgetedThisMonth: 0,
					targetMonth,
					currentMonth,
				});
				return {
					remaining,
					monthsLeft: progress.monthsLeft,
					perMonth:
						progress.requiredPerMonth === null
							? null
							: pkr(progress.requiredPerMonth),
				};
			}
			return { error: "Give either monthlyAmount or targetMonth" };
		},
	}),
};

export const writeTools = {
	createSavingsGoal: tool({
		description:
			"Create a savings goal. It gets its own budget category (or links an existing one) - the user saves by budgeting into it monthly. Requires the user's confirmation.",
		inputSchema: z.object({
			name: z.string().min(2).max(60),
			targetAmount: amount,
			targetMonth: monthKey.optional(),
			linkCategory: z
				.string()
				.optional()
				.describe("Existing category name to back the goal, if any"),
			notes: z.string().max(500).optional(),
		}),
		execute: async ({
			name,
			targetAmount,
			targetMonth,
			linkCategory,
			notes,
		}) => {
			let categoryId: string | undefined;
			if (linkCategory) {
				const ref = resolveCategory(linkCategory);
				if (!ref)
					return { ok: false, error: `No category named "${linkCategory}"` };
				categoryId = ref.id;
			}
			try {
				const id = createGoalRecord({
					name,
					targetAmount: toCents(targetAmount),
					targetMonth: targetMonth ?? null,
					categoryId,
					notes,
				});
				revalidateMoneyPages();
				const goal = getGoals().find((g) => g.id === id);
				return { ok: true, goal: goal ? goalSummary(goal) : { id } };
			} catch (error) {
				if (error instanceof GoalError)
					return { ok: false, error: error.message };
				throw error;
			}
		},
	}),

	updateSavingsGoal: tool({
		description:
			"Change a savings goal's name, target amount, target month or notes. Requires the user's confirmation.",
		inputSchema: z.object({
			goalId: z.string(),
			name: z.string().min(2).max(60).optional(),
			targetAmount: amount.optional(),
			targetMonth: monthKey.optional(),
			notes: z.string().max(500).optional(),
		}),
		execute: async ({ goalId, name, targetAmount, targetMonth, notes }) => {
			try {
				updateGoalRecord(goalId, {
					name,
					targetAmount:
						targetAmount === undefined ? undefined : toCents(targetAmount),
					targetMonth,
					notes,
				});
				revalidateMoneyPages();
				const goal = getGoals({ includeArchived: true }).find(
					(g) => g.id === goalId,
				);
				return { ok: true, goal: goal ? goalSummary(goal) : { id: goalId } };
			} catch (error) {
				if (error instanceof GoalError)
					return { ok: false, error: error.message };
				throw error;
			}
		},
	}),

	setBudgetAmount: tool({
		description:
			"Set how much is budgeted (assigned) to a category for one month. This replaces that month's amount - it is not added to it. Use it to fund a goal's category. Requires the user's confirmation.",
		inputSchema: z.object({
			category: z.string().describe("Category name"),
			month: monthKey,
			amount: z
				.number()
				.min(0)
				.describe("New budgeted amount in PKR for that month"),
		}),
		execute: async ({ category, month, amount: value }) => {
			const ref = resolveCategory(category);
			if (!ref) return { ok: false, error: `No category named "${category}"` };
			if (ref.isIncome) {
				return { ok: false, error: "Income categories can't be budgeted" };
			}
			await setBudgetedAmount(ref.id, month, value);
			const view = getBudgetView(month);
			const row = view.groups
				.flatMap((g) => g.categories)
				.find((c) => c.id === ref.id);
			return {
				ok: true,
				category: ref.name,
				month,
				budgeted: row ? pkr(row.budgeted) : value,
				available: row ? pkr(row.available) : null,
				toBudget: pkr(view.toBudget),
			};
		},
	}),
};

export const financeTools = { ...readTools, ...writeTools };
export type FinanceTools = typeof financeTools;
export const WRITE_TOOL_NAMES = Object.keys(
	writeTools,
) as (keyof typeof writeTools)[];
