"use server";

import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {
	copyBudgetFromMonth,
	getBudgetView,
	usedCategoryIds,
} from "@/lib/budget";
import { TO_BUDGET } from "@/lib/budget-targets";
import { isMonthKey, monthsBetween } from "@/lib/date";
import { db } from "@/lib/db";
import {
	budget_months,
	categories,
	category_group,
	monthly_budgets,
	transactions,
} from "@/lib/db/schema";
import { toCents } from "@/lib/money";

const revalidateBudget = () => {
	revalidatePath("/budget");
	revalidatePath("/");
};

const resequenceExpenseGroups = () => {
	const groups = db
		.select({ id: category_group.id })
		.from(category_group)
		.where(eq(category_group.is_income, false))
		.orderBy(asc(category_group.sort_order), asc(category_group.id))
		.all();
	groups.forEach((group, index) => {
		db.update(category_group)
			.set({ sort_order: index + 1 })
			.where(eq(category_group.id, group.id))
			.run();
	});
	db.update(category_group)
		.set({ sort_order: 9999 })
		.where(eq(category_group.is_income, true))
		.run();
};

/** `amount` is decimal (e.g. 1500.50) - the amount actually assigned this
 * month, not cumulative. Stored internally as cents. */
export async function setBudgetedAmount(
	categoryId: string,
	month: string,
	amount: number,
) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const normalizedAmount = Number.isFinite(amount) ? toCents(amount) : 0;
	const category = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) {
		throw new Error(`Category not found: ${categoryId}`);
	}

	db.transaction(() => {
		const existing = db
			.select({ carryover: monthly_budgets.carryover })
			.from(monthly_budgets)
			.where(
				and(
					eq(monthly_budgets.category_id, categoryId),
					eq(monthly_budgets.month, month),
				),
			)
			.get();
		if (normalizedAmount === 0 && !existing?.carryover) {
			db.delete(monthly_budgets)
				.where(
					and(
						eq(monthly_budgets.category_id, categoryId),
						eq(monthly_budgets.month, month),
					),
				)
				.run();
			return;
		}
		db.insert(monthly_budgets)
			.values({
				category_id: categoryId,
				month,
				amount: normalizedAmount,
				carryover: inheritedCarryover(categoryId, month),
			})
			.onConflictDoUpdate({
				target: [monthly_budgets.category_id, monthly_budgets.month],
				set: { amount: sql`excluded.amount` },
			})
			.run();
	});

	revalidateBudget();
}

const inheritedCarryover = (categoryId: string, month: string) =>
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

/** Like Actual, the flag applies to this month and every later month. */
export async function setCategoryCarryover(
	categoryId: string,
	month: string,
	carryover: boolean,
) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
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
	revalidateBudget();
}

/** Moves `amount` (decimal) of this month's budget out of one category, into
 * another one or back to To Budget. */
export async function transferBetweenCategories(
	fromId: string,
	toId: string,
	month: string,
	amount: number,
) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const cents = Number.isFinite(amount) ? toCents(amount) : 0;
	if (cents <= 0 || fromId === toId) {
		throw new Error("Pick two different categories and an amount above 0");
	}
	const moves: (readonly [string, number])[] = [[fromId, -cents]];
	if (toId !== TO_BUDGET) moves.push([toId, cents]);
	db.transaction(() => {
		for (const [categoryId, delta] of moves) {
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
	});
	revalidateBudget();
}

/** `amount` is decimal; it can't exceed what's left to budget this month. */
export async function holdForNextMonth(month: string, amount: number) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const view = getBudgetView(month);
	const available = view.toBudget + view.buffered;
	const buffered = Math.min(
		Math.max(toCents(amount), 0),
		Math.max(available, 0),
	);
	db.insert(budget_months)
		.values({ month, buffered })
		.onConflictDoUpdate({ target: budget_months.month, set: { buffered } })
		.run();
	revalidateBudget();
	return { buffered };
}

export async function resetHold(month: string) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	db.delete(budget_months).where(eq(budget_months.month, month)).run();
	revalidateBudget();
}

export async function setBudgetedAmountFromForm(formData: FormData) {
	const categoryId = String(formData.get("category_id") ?? "");
	const month = String(formData.get("month") ?? "");
	const amount = Number(formData.get("amount") ?? 0);
	await setBudgetedAmount(categoryId, month, amount);
}

const requireExpenseGroup = (groupId: string) => {
	const group = db
		.select({ id: category_group.id, is_income: category_group.is_income })
		.from(category_group)
		.where(eq(category_group.id, groupId))
		.get();
	if (!group) throw new Error(`Category group not found: ${groupId}`);
	return group;
};

export async function createBudgetGroup(name: string) {
	const nextName = name.trim();
	if (!nextName) {
		throw new Error("Group name is required");
	}
	db.transaction(() => {
		const maxSort = db
			.select({
				max_sort: sql<number>`coalesce(max(${category_group.sort_order}), 0)`,
			})
			.from(category_group)
			.where(eq(category_group.is_income, false))
			.get();

		db.insert(category_group)
			.values({
				id: crypto.randomUUID(),
				name: nextName,
				sort_order: (maxSort?.max_sort || 0) + 1,
				is_income: false,
			})
			.run();
		resequenceExpenseGroups();
	});
	revalidateBudget();
}

export async function renameBudgetGroup(groupId: string, name: string) {
	const nextName = name.trim();
	if (!nextName) throw new Error("Group name is required");
	const group = requireExpenseGroup(groupId);
	if (group.is_income) {
		throw new Error("Income group cannot be renamed");
	}
	db.update(category_group)
		.set({ name: nextName })
		.where(eq(category_group.id, group.id))
		.run();
	revalidateBudget();
}

export async function deleteBudgetGroup(groupId: string) {
	const group = requireExpenseGroup(groupId);
	if (group.is_income) {
		throw new Error("Income group cannot be deleted");
	}
	const count = db
		.select({ count: sql<number>`count(*)` })
		.from(categories)
		.where(eq(categories.group_id, group.id))
		.get();
	if ((count?.count ?? 0) > 0) {
		throw new Error("Move or delete categories before deleting this group");
	}
	db.transaction(() => {
		db.delete(category_group).where(eq(category_group.id, group.id)).run();
		resequenceExpenseGroups();
	});
	revalidateBudget();
}

export async function reorderBudgetGroups(groupIds: string[]) {
	if (!groupIds.length) return;
	db.transaction(() => {
		groupIds.forEach((groupId, index) => {
			db.update(category_group)
				.set({ sort_order: index + 1 })
				.where(
					and(
						eq(category_group.id, groupId),
						eq(category_group.is_income, false),
					),
				)
				.run();
		});
		resequenceExpenseGroups();
	});
	revalidateBudget();
}

export async function createBudgetCategory(groupId: string, name: string) {
	const nextName = name.trim();
	if (!nextName) throw new Error("Category name is required");
	const group = requireExpenseGroup(groupId);
	db.transaction(() => {
		const maxSort = db
			.select({
				max_sort: sql<number>`coalesce(max(${categories.sort_order}), 0)`,
			})
			.from(categories)
			.where(eq(categories.group_id, group.id))
			.get();

		db.insert(categories)
			.values({
				id: crypto.randomUUID(),
				name: nextName,
				group_id: group.id,
				sort_order: (maxSort?.max_sort || 0) + 1,
			})
			.run();
	});
	revalidateBudget();
}

export async function renameBudgetCategory(categoryId: string, name: string) {
	const nextName = name.trim();
	if (!nextName) throw new Error("Category name is required");
	const category = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) throw new Error("Category not found");
	db.update(categories)
		.set({ name: nextName })
		.where(eq(categories.id, category.id))
		.run();
	revalidateBudget();
}

/** Like Actual, a category with transactions or budgeted money hands both to
 * `transferToId` before it's deleted, so balances and To Budget don't change. */
export async function deleteBudgetCategory(
	categoryId: string,
	transferToId: string | null = null,
) {
	const category = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) return;
	if (transferToId === category.id) {
		throw new Error("Pick a different category to transfer to");
	}
	if (!transferToId && usedCategoryIds().has(category.id)) {
		throw new Error("Pick a category to transfer this category's money to");
	}
	db.transaction(() => {
		if (transferToId) {
			db.update(transactions)
				.set({ category_id: transferToId })
				.where(eq(transactions.category_id, category.id))
				.run();
			const budgets = db
				.select({
					month: monthly_budgets.month,
					amount: monthly_budgets.amount,
				})
				.from(monthly_budgets)
				.where(eq(monthly_budgets.category_id, category.id))
				.all();
			for (const { month, amount } of budgets) {
				if (amount === 0) continue;
				db.insert(monthly_budgets)
					.values({
						category_id: transferToId,
						month,
						amount,
						carryover: inheritedCarryover(transferToId, month),
					})
					.onConflictDoUpdate({
						target: [monthly_budgets.category_id, monthly_budgets.month],
						set: { amount: sql`${monthly_budgets.amount} + ${amount}` },
					})
					.run();
			}
		}
		db.delete(categories).where(eq(categories.id, category.id)).run();
	});
	revalidateBudget();
	revalidatePath("/transactions");
}

/** Copies every category's assignment from the previous month into this one. */
export async function copyPreviousMonthBudget(month: string) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const [year, m] = month.split("-").map(Number);
	const prevDate = new Date(year, m - 2, 1);
	const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, "0")}`;
	const copied = copyBudgetFromMonth(prevMonth, month);
	revalidateBudget();
	return { copied };
}
