import { describe, expect, it } from "vitest";
import { buildImportRows, parseAmount } from "@/lib/csv-import-rows";

describe("parseAmount", () => {
	it("treats parentheses as negative", () => {
		expect(parseAmount("(1,234.50)")).toBe(-1234.5);
		expect(parseAmount("($12.00)")).toBe(-12);
	});

	it("parses plain, signed and formatted amounts", () => {
		expect(parseAmount("1,234.50")).toBe(1234.5);
		expect(parseAmount("-$5.25")).toBe(-5.25);
		expect(parseAmount("abc")).toBeNull();
	});
});

describe("buildImportRows", () => {
	it("maps accounting negatives to payments and honors flip", () => {
		const columnMap = ["date", "amount"] as const;
		const data = [
			["2026-10-01", "(1,234.50)"],
			["2026-10-02", "20"],
			["bad", "5"],
		];
		const normal = buildImportRows(data, [...columnMap], "YYYY-MM-DD", false);
		expect(normal.skippedInvalidDate).toBe(1);
		expect(normal.rows).toEqual([
			{ date: "2026-10-01", payment: 1234.5 },
			{ date: "2026-10-02", deposit: 20 },
		]);
		const flipped = buildImportRows(data, [...columnMap], "YYYY-MM-DD", true);
		expect(flipped.rows[0]).toEqual({ date: "2026-10-01", deposit: 1234.5 });
	});
});
