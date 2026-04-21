"use server";

import { revalidatePath } from "next/cache";
import db from "@/app/actions/database";
import { isMonthKey } from "@/lib/date";

const revalidateBudget = () => {
	revalidatePath("/budget");
	revalidatePath("/");
};

const resequenceExpenseGroups = () => {
	const groups = db
		.prepare(
			"SELECT id FROM category_group WHERE is_income = 0 ORDER BY sort_order ASC, id ASC",
		)
		.all() as Array<{ id: string }>;
	groups.forEach((group, index) => {
		db.prepare("UPDATE category_group SET sort_order = ? WHERE id = ?").run(
			index + 1,
			group.id,
		);
	});
	db.prepare(
		"UPDATE category_group SET sort_order = 9999 WHERE is_income = 1",
	).run();
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
		.prepare("SELECT id FROM categories WHERE id = ?")
		.get(categoryId) as { id: string } | undefined;
	if (!category) {
		throw new Error(`Category not found: ${categoryId}`);
	}

	db.transaction(() => {
		if (normalizedAmount === 0) {
			db.prepare(
				"DELETE FROM monthly_budgets WHERE category_id = ? AND month = ?",
			).run(categoryId, month);
			return;
		}
		db.prepare(
			`
        INSERT INTO monthly_budgets (category_id, month, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(category_id, month)
        DO UPDATE SET amount = excluded.amount
      `,
		).run(categoryId, month, normalizedAmount);
	})();

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
		.prepare("SELECT id, is_income FROM category_group WHERE id = ?")
		.get(groupId) as { id: string; is_income: number } | undefined;
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
			.prepare(
				"SELECT COALESCE(MAX(sort_order), 0) as max_sort FROM category_group WHERE is_income = 0",
			)
			.get() as { max_sort: number };
		db.prepare(
			"INSERT INTO category_group (id, name, sort_order, is_income) VALUES (?, ?, ?, 0)",
		).run(crypto.randomUUID(), nextName, (maxSort.max_sort || 0) + 1);
		resequenceExpenseGroups();
	})();
	revalidateBudget();
}

export async function renameBudgetGroup(groupId: string, name: string) {
	const nextName = name.trim();
	if (!nextName) throw new Error("Group name is required");
	const group = requireExpenseGroup(groupId);
	if (group.is_income === 1) {
		throw new Error("Income group cannot be renamed");
	}
	db.prepare("UPDATE category_group SET name = ? WHERE id = ?").run(
		nextName,
		group.id,
	);
	revalidateBudget();
}

export async function deleteBudgetGroup(groupId: string) {
	const group = requireExpenseGroup(groupId);
	if (group.is_income === 1) {
		throw new Error("Income group cannot be deleted");
	}
	const count = db
		.prepare("SELECT COUNT(*) AS count FROM categories WHERE group_id = ?")
		.get(group.id) as { count: number };
	if (count.count > 0) {
		throw new Error("Move or delete categories before deleting this group");
	}
	db.transaction(() => {
		db.prepare("DELETE FROM category_group WHERE id = ?").run(group.id);
		resequenceExpenseGroups();
	})();
	revalidateBudget();
}

export async function reorderBudgetGroups(groupIds: string[]) {
	if (!groupIds.length) return;
	db.transaction(() => {
		groupIds.forEach((groupId, index) => {
			db.prepare(
				"UPDATE category_group SET sort_order = ? WHERE id = ? AND is_income = 0",
			).run(index + 1, groupId);
		});
		resequenceExpenseGroups();
	})();
	revalidateBudget();
}

export async function createBudgetCategory(groupId: string, name: string) {
	const nextName = name.trim();
	if (!nextName) throw new Error("Category name is required");
	const group = requireExpenseGroup(groupId);
	db.transaction(() => {
		const maxSort = db
			.prepare(
				"SELECT COALESCE(MAX(sort_order), 0) AS max_sort FROM categories WHERE group_id = ?",
			)
			.get(group.id) as { max_sort: number };
		db.prepare(
			"INSERT INTO categories (id, name, group_id, sort_order) VALUES (?, ?, ?, ?)",
		).run(crypto.randomUUID(), nextName, group.id, (maxSort.max_sort || 0) + 1);
	})();
	revalidateBudget();
}

export async function renameBudgetCategory(categoryId: string, name: string) {
	const nextName = name.trim();
	if (!nextName) throw new Error("Category name is required");
	const category = db
		.prepare("SELECT id FROM categories WHERE id = ?")
		.get(categoryId) as { id: string } | undefined;
	if (!category) throw new Error("Category not found");
	db.prepare("UPDATE categories SET name = ? WHERE id = ?").run(
		nextName,
		category.id,
	);
	revalidateBudget();
}

export async function deleteBudgetCategory(categoryId: string) {
	const category = db
		.prepare("SELECT id FROM categories WHERE id = ?")
		.get(categoryId) as { id: string } | undefined;
	if (!category) return;
	db.prepare("DELETE FROM categories WHERE id = ?").run(category.id);
	revalidateBudget();
}
