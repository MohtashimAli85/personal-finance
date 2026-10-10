import { getMonthRange } from "@/lib/date";

export function categoryTransactionsHref(categoryId: string, month: string) {
	const { start, end } = getMonthRange(month);
	return `/transactions?${new URLSearchParams({
		categoryId,
		from: start,
		to: end,
		draftCategoryId: categoryId,
		new: "1",
	}).toString()}`;
}
