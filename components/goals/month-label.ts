import { format } from "date-fns";

export function formatMonthLabel(month: string): string {
	const [year, monthNumber] = month.split("-").map(Number);
	if (!year || !monthNumber) return month;
	return format(new Date(year, monthNumber - 1, 1), "MMM yyyy");
}
