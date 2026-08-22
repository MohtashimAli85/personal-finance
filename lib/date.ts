import { format } from "date-fns";

export const formateDate = (date: string | Date) => format(date, "dd/MM/yyyy");

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;

export const getMonthKey = (date: Date = new Date()) => format(date, "yyyy-MM");

export const isMonthKey = (value: string) => MONTH_KEY_RE.test(value);

export const getMonthRange = (month: string) => {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const [year, monthNumber] = month.split("-").map(Number);
	const start = new Date(Date.UTC(year, monthNumber - 1, 1));
	const end = new Date(Date.UTC(year, monthNumber, 1));
	return {
		start: start.toISOString(),
		end: end.toISOString(),
	};
};
