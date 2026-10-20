import { and, desc, eq, lt, sql } from "drizzle-orm";
import { getBudgetView } from "@/lib/budget";
import { TO_BUDGET } from "@/lib/budget-targets";
import { monthsBetween } from "@/lib/date";
import { db } from "@/lib/db";
import { budget_months, categories, monthly_budgets } from "@/lib/db/schema";
import { UserError } from "@/lib/user-error";

export const inheritedCarryover = (categoryId: string, month: string) =>
	db
		.select({ carryover: monthly_budgets.carryover })
		.from(monthly_budgets)
		.where(
			and(
				eq(monthly_budgets.category_id, categoryId),
				lt(monthly_budgets.month, month),
			),
		)
		.orderBy(desc(monthly_budgets.month))
		.get()?.carryover ?? false;

/** Adds `delta` cents to a category's budget for one month. */
export function addToBudget(categoryId: string, month: string, delta: number) {
	db.insert(monthly_budgets)
		.values({
			category_id: categoryId,
			month,
			amount: delta,
			carryover: inheritedCarryover(categoryId, month),
		})
		.onConflictDoUpdate({
			target: [monthly_budgets.category_id, monthly_budgets.month],
			set: { amount: sql`${monthly_budgets.amount} + ${delta}` },
		})
		.run();
}

/** `amount` is the cents assigned this month, not cumulative. */
export function setBudgetedAmount(
	categoryId: string,
	month: string,
	amount: number,
) {
	const category = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) throw new UserError("Category not found.");

	const cell = and(
		eq(monthly_budgets.category_id, categoryId),
		eq(monthly_budgets.month, month),
	);
	db.transaction(() => {
		const existing = db
			.select({ carryover: monthly_budgets.carryover })
			.from(monthly_budgets)
			.where(cell)
			.get();
		if (amount === 0 && !existing?.carryover) {
			db.delete(monthly_budgets).where(cell).run();
			return;
		}
		db.insert(monthly_budgets)
			.values({
				category_id: categoryId,
				month,
				amount,
				carryover: inheritedCarryover(categoryId, month),
			})
			.onConflictDoUpdate({
				target: [monthly_budgets.category_id, monthly_budgets.month],
				set: { amount: sql`excluded.amount` },
			})
			.run();
	});
}

/** Like Actual, the flag applies to this month and every later month. */
export function setCategoryCarryover(
	categoryId: string,
	month: string,
	carryover: boolean,
) {
	const lastMonth =
		db
			.select({ month: sql<string>`max(${monthly_budgets.month})` })
			.from(monthly_budgets)
			.get()?.month ?? month;
	db.transaction(() => {
		for (const m of monthsBetween(
			month,
			lastMonth > month ? lastMonth : month,
		)) {
			db.insert(monthly_budgets)
				.values({ category_id: categoryId, month: m, amount: 0, carryover })
				.onConflictDoUpdate({
					target: [monthly_budgets.category_id, monthly_budgets.month],
					set: { carryover },
				})
				.run();
		}
	});
}

/** Moves `amount` cents of this month's budget out of one category, into
 * another one or back to To Budget. */
export function transferBetweenCategories(
	fromId: string,
	toId: string,
	month: string,
	amount: number,
) {
	if (amount <= 0 || fromId === toId) {
		throw new UserError("Pick two different categories and an amount above 0");
	}
	db.transaction(() => {
		addToBudget(fromId, month, -amount);
		if (toId !== TO_BUDGET) addToBudget(toId, month, amount);
	});
}

/** Holds `amount` cents for next month, capped at what's left to budget. */
export function holdForNextMonth(month: string, amount: number): number {
	const view = getBudgetView(month);
	const available = view.toBudget + view.buffered;
	const buffered = Math.min(Math.max(amount, 0), Math.max(available, 0));
	db.insert(budget_months)
		.values({ month, buffered })
		.onConflictDoUpdate({ target: budget_months.month, set: { buffered } })
		.run();
	return buffered;
}

export function resetHold(month: string) {
	db.delete(budget_months).where(eq(budget_months.month, month)).run();
}
