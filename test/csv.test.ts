import { describe, expect, it } from "vitest";
import { detectDelimiter, parseCSV, parseDate, serializeCSV } from "@/lib/csv";

describe("parseDate", () => {
	it("parses YYYY-MM-DD without any timezone shift", () => {
		expect(parseDate("2026-09-01", "YYYY-MM-DD")).toBe("2026-09-01");
	});

	it("parses DD/MM/YYYY", () => {
		expect(parseDate("21/09/2026", "DD/MM/YYYY")).toBe("2026-09-21");
	});

	it("parses MM/DD/YYYY", () => {
		expect(parseDate("09/21/2026", "MM/DD/YYYY")).toBe("2026-09-21");
	});

	it("never shifts a date across a day boundary regardless of host timezone", () => {
		// This is the regression case for the local-time round-trip bug: the
		// first and last day of a month must survive parsing untouched.
		expect(parseDate("2026-09-01", "YYYY-MM-DD")).toBe("2026-09-01");
		expect(parseDate("2026-09-30", "YYYY-MM-DD")).toBe("2026-09-30");
		expect(parseDate("01/01/2026", "DD/MM/YYYY")).toBe("2026-01-01");
	});

	it("returns null for an invalid calendar date instead of guessing", () => {
		expect(parseDate("2026-02-31", "YYYY-MM-DD")).toBeNull();
		expect(parseDate("31/02/2026", "DD/MM/YYYY")).toBeNull();
	});

	it("returns null for unparseable input", () => {
		expect(parseDate("not a date", "YYYY-MM-DD")).toBeNull();
		expect(parseDate("2026-09-01", "UNKNOWN-FORMAT")).toBeNull();
	});
});

describe("parseCSV", () => {
	it("splits rows and columns, respecting quoted fields", () => {
		const rows = parseCSV('a,b,c\n"1,000",2,"say ""hi"""');
		expect(rows).toEqual([
			["a", "b", "c"],
			["1,000", "2", 'say "hi"'],
		]);
	});

	it("strips a BOM and normalizes line endings", () => {
		const rows = parseCSV("﻿a,b\r\n1,2\r\n");
		expect(rows).toEqual([
			["a", "b"],
			["1", "2"],
		]);
	});

	it("skips blank lines", () => {
		const rows = parseCSV("a,b\n\n1,2\n");
		expect(rows).toEqual([
			["a", "b"],
			["1", "2"],
		]);
	});
});

describe("detectDelimiter", () => {
	it("picks the delimiter that appears most often in the header row", () => {
		expect(detectDelimiter("a,b,c")).toBe(",");
		expect(detectDelimiter("a;b;c")).toBe(";");
		expect(detectDelimiter("a\tb\tc")).toBe("\t");
	});
});

describe("serializeCSV", () => {
	it("quotes fields containing the delimiter, quotes, or newlines", () => {
		const csv = serializeCSV(
			["Name", "Note"],
			[["Ali", 'has "quotes", and, commas']],
		);
		expect(csv).toBe('Name,Note\nAli,"has ""quotes"", and, commas"');
	});
});
