"use client";

import { format } from "date-fns";
import { useStore } from "@/context/store-context";
import { useQueryParams } from "@/hooks/use-query-params";
import {
	formatShortDate,
	getMonthRange,
	isMonthKey,
	parseMonthKey,
} from "@/lib/date";

function dateLabel(from: string, to: string) {
	const month = from.slice(0, 7);
	if (isMonthKey(month)) {
		const range = getMonthRange(month);
		if (range.start === from && range.end === to) {
			return format(parseMonthKey(month), "MMMM yyyy");
		}
	}
	if (from && to)
		return `${formatShortDate(from)} to before ${formatShortDate(to)}`;
	return from
		? `From ${formatShortDate(from)}`
		: `Before ${formatShortDate(to)}`;
}

export function useTransactionFilters() {
	const { searchParams, setParams } = useQueryParams();
	const categories = useStore((s) => s.groupedCategories);
	const categoryId = searchParams.get("categoryId") ?? "";
	const from = searchParams.get("from") ?? "";
	const to = searchParams.get("to") ?? "";
	const search = searchParams.get("search") ?? "";

	const categoryName = categories
		.flatMap((group) => group.categories)
		.find((category) => category.id === categoryId)?.name;

	const chips = [
		categoryId && {
			key: "category",
			label: categoryName ?? "Category",
			clear: () =>
				setParams({
					categoryId: undefined,
					draftCategoryId: undefined,
					limit: undefined,
				}),
		},
		(from || to) && {
			key: "date",
			label: dateLabel(from, to),
			clear: () =>
				setParams({ from: undefined, to: undefined, limit: undefined }),
		},
	].filter((chip) => !!chip);

	const clearAll = () =>
		setParams({
			search: undefined,
			categoryId: undefined,
			draftCategoryId: undefined,
			from: undefined,
			to: undefined,
			limit: undefined,
		});

	return { chips, clearAll, filtered: chips.length > 0 || !!search };
}
