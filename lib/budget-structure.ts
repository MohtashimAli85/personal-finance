import { and, asc, eq, sql } from "drizzle-orm";
import { getCategoryGoalName, isCategoryInUse } from "@/lib/budget";
import { inheritedCarryover } from "@/lib/budget-mutations";
import { db } from "@/lib/db";
import {
	categories,
	category_group,
	monthly_budgets,
	transactions,
} from "@/lib/db/schema";
import { UserError } from "@/lib/user-error";

function withUniqueName(label: string, write: () => void) {
	try {
		write();
	} catch (error) {
		if ((error as { code?: string }).code === "SQLITE_CONSTRAINT_UNIQUE") {
			throw new UserError(`A ${label} with this name already exists.`);
		}
		throw error;
	}
}

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

const requireExpenseGroup = (groupId: string) => {
	const group = db
		.select({ id: category_group.id, is_income: category_group.is_income })
		.from(category_group)
		.where(eq(category_group.id, groupId))
		.get();
	if (!group) throw new UserError("Category group not found.");
	if (group.is_income) {
		throw new UserError("The income group can't be changed.");
	}
	return group;
};

const requireExpenseCategory = (categoryId: string) => {
	const category = db
		.select({ id: categories.id, is_income: category_group.is_income })
		.from(categories)
		.leftJoin(category_group, eq(categories.group_id, category_group.id))
		.where(eq(categories.id, categoryId))
		.get();
	if (!category) throw new UserError("Category not found.");
	if (category.is_income) {
		throw new UserError("Pick an expense category to transfer to");
	}
	return category;
};

const mergeCategoryInto = (fromId: string, toId: string) => {
	db.update(transactions)
		.set({ category_id: toId })
		.where(eq(transactions.category_id, fromId))
		.run();
	const rows = db
		.select({
			month: monthly_budgets.month,
			amount: monthly_budgets.amount,
			carryover: monthly_budgets.carryover,
		})
		.from(monthly_budgets)
		.where(eq(monthly_budgets.category_id, fromId))
		.orderBy(asc(monthly_budgets.month))
		.all();
	for (const { month, amount, carryover } of rows) {
		if (amount === 0 && !carryover) continue;
		db.insert(monthly_budgets)
			.values({
				category_id: toId,
				month,
				amount,
				carryover: carryover || inheritedCarryover(toId, month),
			})
			.onConflictDoUpdate({
				target: [monthly_budgets.category_id, monthly_budgets.month],
				set: { amount: sql`${monthly_budgets.amount} + ${amount}` },
			})
			.run();
	}
};

export function createBudgetGroup(name: string) {
	withUniqueName("group", () =>
		db.transaction(() => {
			db.insert(category_group)
				.values({
					id: crypto.randomUUID(),
					name,
					sort_order: Number.MAX_SAFE_INTEGER,
					is_income: false,
				})
				.run();
			resequenceExpenseGroups();
		}),
	);
}

export function renameBudgetGroup(groupId: string, name: string) {
	const group = requireExpenseGroup(groupId);
	withUniqueName("group", () =>
		db
			.update(category_group)
			.set({ name })
			.where(eq(category_group.id, group.id))
			.run(),
	);
}

export function deleteBudgetGroup(groupId: string) {
	const group = requireExpenseGroup(groupId);
	const count = db
		.select({ count: sql<number>`count(*)` })
		.from(categories)
		.where(eq(categories.group_id, group.id))
		.get();
	if ((count?.count ?? 0) > 0) {
		throw new UserError("Move or delete categories before deleting this group");
	}
	db.transaction(() => {
		db.delete(category_group).where(eq(category_group.id, group.id)).run();
		resequenceExpenseGroups();
	});
}

export function reorderBudgetGroups(groupIds: string[]) {
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
}

export function createBudgetCategory(groupId: string, name: string) {
	const group = requireExpenseGroup(groupId);
	db.transaction(() => {
		const maxSort = db
			.select({
				max_sort: sql<number>`coalesce(max(${categories.sort_order}), 0)`,
			})
			.from(categories)
			.where(eq(categories.group_id, group.id))
			.get();

		withUniqueName("category", () =>
			db
				.insert(categories)
				.values({
					id: crypto.randomUUID(),
					name,
					group_id: group.id,
					sort_order: (maxSort?.max_sort || 0) + 1,
				})
				.run(),
		);
	});
}

export function renameBudgetCategory(categoryId: string, name: string) {
	withUniqueName("category", () => {
		const updated = db
			.update(categories)
			.set({ name })
			.where(eq(categories.id, categoryId))
			.run();
		if (updated.changes === 0) throw new UserError("Category not found.");
	});
}

/** Like Actual, a category with transactions or budgeted money hands both to
 * `transferToId` before it's deleted, so balances and To Budget don't change.
 * Rollover flags move too, except in months where the target already has its
 * own row. A category linked to a goal can't be deleted. */
export function deleteBudgetCategory(
	categoryId: string,
	transferToId: string | null,
) {
	if (transferToId === categoryId) {
		throw new UserError("Pick a different category to transfer to");
	}
	db.transaction(() => {
		const category = db
			.select({ id: categories.id })
			.from(categories)
			.where(eq(categories.id, categoryId))
			.get();
		if (!category) return;
		const goalName = getCategoryGoalName(category.id);
		if (goalName) {
			throw new UserError(
				`This category is linked to the goal "${goalName}". Delete the goal first.`,
			);
		}
		if (!transferToId) {
			if (isCategoryInUse(category.id)) {
				throw new UserError(
					"Pick a category to transfer this category's money to",
				);
			}
		} else {
			requireExpenseCategory(transferToId);
			mergeCategoryInto(category.id, transferToId);
		}
		db.delete(categories).where(eq(categories.id, category.id)).run();
	});
}
