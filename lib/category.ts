import { cache } from "react";
import db from "@/app/actions/database";

type CategoryRow = {
	category_id: string | null;
	category_name: string | null;
	category_sort_order: number | null;
	group_id: string;
	group_name: string;
	group_sort_order: number;
	group_is_income: number;
};

export const getGroupedCategories = cache((): GroupedCategory[] => {
	const rows = db
		.prepare(
			`
      SELECT
        c.id            AS category_id,
        c.name          AS category_name,
        c.sort_order    AS category_sort_order,
        g.id            AS group_id,
        g.name          AS group_name,
        g.sort_order    AS group_sort_order,
        g.is_income     AS group_is_income
      FROM category_group g
      LEFT JOIN categories c ON c.group_id = g.id
      ORDER BY
        COALESCE(g.is_income, 0) ASC,
        COALESCE(g.sort_order, 9998) ASC,
        g.name ASC,
        c.sort_order ASC,
        c.name ASC
    `,
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
				is_income: row.group_is_income === 1,
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
