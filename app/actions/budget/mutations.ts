"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { isMonthKey } from "@/lib/date";
import { db } from "@/lib/db";
import { categories, category_group, monthly_budgets } from "@/lib/db/schema";

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

export async function setBudgetedAmount(
	categoryId: string,
	month: string,
	amount: number,
) {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const normalizedAmount = Number.isFinite(amount) ? amount : 0;
	const category = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) {
		throw new Error(`Category not found: ${categoryId}`);
	}

	db.transaction(() => {
		if (normalizedAmount === 0) {
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
			})
			.onConflictDoUpdate({
				target: [monthly_budgets.category_id, monthly_budgets.month],
				set: { amount: sql`excluded.amount` },
			})
			.run();
	});

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

export async function deleteBudgetCategory(categoryId: string) {
	const category = db
		.select({ id: categories.id })
		.from(categories)
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) return;
	db.delete(categories).where(eq(categories.id, category.id)).run();
	revalidateBudget();
}
