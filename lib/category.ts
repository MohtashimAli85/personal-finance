import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { categories, category_group } from "@/lib/db/schema";

type CategoryRow = {
	category_id: string | null;
	category_name: string | null;
	category_sort_order: number | null;
	group_id: string;
	group_name: string;
	group_sort_order: number;
	group_is_income: boolean;
};

const groupedSelect = {
	category_id: categories.id,
	category_name: categories.name,
	category_sort_order: categories.sort_order,
	group_id: category_group.id,
	group_name: category_group.name,
	group_sort_order: category_group.sort_order,
	group_is_income: category_group.is_income,
};

export const getGroupedCategories = cache((): GroupedCategory[] => {
	const rows = db
		.select(groupedSelect)
		.from(category_group)
		.leftJoin(categories, eq(categories.group_id, category_group.id))
		.orderBy(
			asc(category_group.is_income),
			asc(category_group.sort_order),
			asc(category_group.name),
			asc(categories.sort_order),
			asc(categories.name),
		)
		.all() as CategoryRow[];

	const groups = new Map<string, GroupedCategory>();

	for (const row of rows) {
		const groupId = row.group_id;
		if (!groups.has(groupId)) {
			groups.set(groupId, {
				id: groupId,
				name: row.group_name,
				sort_order: row.group_sort_order ?? 9998,
				is_income: row.group_is_income,
				categories: [],
			});
		}

		if (row.category_id != null) {
			const group = groups.get(groupId);
			if (!group) continue;
			group.categories.push({
				id: row.category_id,
				name: row.category_name ?? "",
				group_id: groupId,
				sort_order: row.category_sort_order ?? 0,
			});
		}
	}

	return Array.from(groups.values()).sort((a, b) => {
		const incomeA = a.is_income ? 1 : 0;
		const incomeB = b.is_income ? 1 : 0;
		if (incomeA !== incomeB) return incomeA - incomeB;
		return (a.sort_order ?? 9998) - (b.sort_order ?? 9998);
	});
});
