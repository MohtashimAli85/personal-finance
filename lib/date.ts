import { format } from "date-fns";

const MONTH_KEY_RE = /^\d{4}-\d{2}$/;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isDateKey = (value: string): boolean => DATE_KEY_RE.test(value);

/**
 * Parses a YYYY-MM-DD date-only key into a local-midnight Date. A stored
 * date is a calendar date, not an instant, so this deliberately avoids any
 * timezone conversion (new Date("2026-09-01") parses as UTC and can render
 * as the previous day in a timezone ahead of UTC).
 */
function parseDateKey(key: string): Date {
	const [year, month, day] = key.split("-").map(Number);
	return new Date(year, month - 1, day);
}

/**
 * Best-effort normalization of any date-like input to a YYYY-MM-DD calendar
 * key in local time. Falls back to today on anything unparseable - use this
 * only where a default is acceptable (e.g. a date picker's initial value).
 * For input a user supplied that must be validated (CSV import), use
 * tryParseDateKey instead so a bad row can be surfaced rather than silently
 * dated "today".
 */
export function toDateKey(input: string | Date | null | undefined): string {
	if (input instanceof Date) {
		if (Number.isNaN(input.getTime())) return toDateKey(new Date());
		return format(input, "yyyy-MM-dd");
	}
	const parsed = tryParseDateKey(input ?? null);
	return parsed ?? toDateKey(new Date());
}

/**
 * Strictly parses a date-like input to a YYYY-MM-DD key, returning null if
 * it cannot be confidently parsed. Accepts an existing date key, a legacy
 * ISO-instant or "YYYY-MM-DD HH:mm:ss" value (takes the date prefix), a unix
 * millisecond timestamp, or anything Date can parse.
 */
export function tryParseDateKey(
	input: string | Date | null | undefined,
): string | null {
	if (input instanceof Date) {
		return Number.isNaN(input.getTime()) ? null : format(input, "yyyy-MM-dd");
	}
	if (!input) return null;
	const raw = String(input).trim();
	if (!raw) return null;
	if (isDateKey(raw)) return raw;

	const prefixMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
	if (prefixMatch) return prefixMatch[1];

	const asNumber = Number(raw);
	if (!Number.isNaN(asNumber) && asNumber > 100000000000) {
		const fromEpoch = new Date(asNumber);
		return Number.isNaN(fromEpoch.getTime())
			? null
			: format(fromEpoch, "yyyy-MM-dd");
	}

	const parsed = new Date(raw);
	return Number.isNaN(parsed.getTime()) ? null : format(parsed, "yyyy-MM-dd");
}

export const formateDate = (date: string | Date): string => {
	if (typeof date === "string" && isDateKey(date)) {
		return format(parseDateKey(date), "dd/MM/yyyy");
	}
	return format(date, "dd/MM/yyyy");
};

export const getMonthKey = (date: Date = new Date()): string =>
	format(date, "yyyy-MM");

export const isMonthKey = (value: string): boolean => MONTH_KEY_RE.test(value);

/**
 * [start, end) bounds for a month as YYYY-MM-DD date keys, comparable
 * lexicographically against the `date` column (also stored as YYYY-MM-DD).
 */
export const getMonthRange = (
	month: string,
): { start: string; end: string } => {
	if (!isMonthKey(month)) {
		throw new Error(`Invalid month key: ${month}`);
	}
	const [year, monthNumber] = month.split("-").map(Number);
	const start = new Date(year, monthNumber - 1, 1);
	const end = new Date(year, monthNumber, 1);
	return {
		start: format(start, "yyyy-MM-dd"),
		end: format(end, "yyyy-MM-dd"),
	};
};

/** All months from `start` (inclusive) through `end` (inclusive), as month keys. */
export function monthsBetween(start: string, end: string): string[] {
	if (!isMonthKey(start) || !isMonthKey(end)) {
		throw new Error("Invalid month key");
	}
	const months: string[] = [];
	let [y, m] = start.split("-").map(Number);
	const [endY, endM] = end.split("-").map(Number);
	while (y < endY || (y === endY && m <= endM)) {
		months.push(`${y}-${String(m).padStart(2, "0")}`);
		m += 1;
		if (m > 12) {
			m = 1;
			y += 1;
		}
	}
	return months;
}
