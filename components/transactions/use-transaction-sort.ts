"use client";

import { useQueryParams } from "@/hooks/use-query-params";

export type SortColumn = "date" | "payment" | "deposit";

export function useTransactionSort(column: SortColumn) {
	const { searchParams, setParams } = useQueryParams();
	const sort = searchParams.get("sort") ?? "date";
	const dir: "asc" | "desc" =
		searchParams.get("dir") === "asc" ? "asc" : "desc";
	const active = sort === column;

	const toggle = () => {
		const next = active && dir === "desc" ? "asc" : "desc";
		const isDefault = column === "date" && next === "desc";
		setParams({
			sort: isDefault ? undefined : column,
			dir: isDefault ? undefined : next,
			limit: undefined,
		});
	};

	return { direction: active ? dir : null, toggle };
}
