import { describe, expect, it } from "vitest";
import {
	formateDate,
	getMonthKey,
	getMonthRange,
	isDateKey,
	isMonthKey,
	monthsBetween,
	toDateKey,
	tryParseDateKey,
} from "@/lib/date";

describe("isDateKey / isMonthKey", () => {
	it("validates the expected formats", () => {
		expect(isDateKey("2026-09-21")).toBe(true);
		expect(isDateKey("2026-9-21")).toBe(false);
		expect(isDateKey("2026-09-21T00:00:00.000Z")).toBe(false);
		expect(isMonthKey("2026-09")).toBe(true);
		expect(isMonthKey("2026-9")).toBe(false);
	});
});

describe("tryParseDateKey", () => {
	it("passes through an already-valid date key", () => {
		expect(tryParseDateKey("2026-09-21")).toBe("2026-09-21");
	});

	it("takes the date prefix of a legacy ISO instant without shifting it", () => {
		// This is the exact legacy format found in production data - the date
		// prefix is trusted as-is (the backfill migration is what corrects the
		// timezone-shifted instants; this function must not re-shift them).
		expect(tryParseDateKey("2026-09-01T00:00:00.000Z")).toBe("2026-09-01");
	});

	it("takes the date prefix of a legacy space-separated timestamp", () => {
		expect(tryParseDateKey("2026-09-01 00:00:00")).toBe("2026-09-01");
	});

	it("parses a unix millisecond timestamp", () => {
		const key = tryParseDateKey(String(Date.UTC(2026, 8, 21, 12, 0, 0)));
		expect(key).toBe("2026-09-21");
	});

	it("returns null for empty or unparseable input", () => {
		expect(tryParseDateKey("")).toBeNull();
		expect(tryParseDateKey(null)).toBeNull();
		expect(tryParseDateKey(undefined)).toBeNull();
		expect(tryParseDateKey("not a date")).toBeNull();
	});
});

describe("toDateKey", () => {
	it("falls back to today for unparseable input rather than throwing", () => {
		const todayKey = toDateKey(new Date());
		expect(toDateKey("garbage")).toBe(todayKey);
	});
});

describe("formateDate", () => {
	it("formats a YYYY-MM-DD key without any timezone shift", () => {
		// This is the regression case for the local-midnight-as-UTC bug: a
		// date key must render as the same calendar day it stores, regardless
		// of the host machine's timezone.
		expect(formateDate("2026-09-01")).toBe("01/09/2026");
		expect(formateDate("2026-01-31")).toBe("31/01/2026");
	});
});

describe("getMonthRange", () => {
	it("returns [start, end) as YYYY-MM-DD date keys spanning the month", () => {
		const { start, end } = getMonthRange("2026-09");
		expect(start).toBe("2026-09-01");
		expect(end).toBe("2026-10-01");
	});

	it("rolls over the year at December", () => {
		const { start, end } = getMonthRange("2026-12");
		expect(start).toBe("2026-12-01");
		expect(end).toBe("2027-01-01");
	});

	it("throws on an invalid month key", () => {
		expect(() => getMonthRange("2026-9")).toThrow();
	});
});

describe("monthsBetween", () => {
	it("lists every month key inclusive of both ends", () => {
		expect(monthsBetween("2026-01", "2026-01")).toEqual(["2026-01"]);
		expect(monthsBetween("2026-11", "2027-02")).toEqual([
			"2026-11",
			"2026-12",
			"2027-01",
			"2027-02",
		]);
	});
});

describe("getMonthKey", () => {
	it("formats a Date as YYYY-MM", () => {
		expect(getMonthKey(new Date(2026, 8, 21))).toBe("2026-09");
	});
});
