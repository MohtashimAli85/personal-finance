import { describe, expect, it } from "vitest";
import { formatMoney, fromCents, sumCents, toCents } from "@/lib/money";

describe("toCents", () => {
	it("converts a decimal rupee value to integer cents", () => {
		expect(toCents(150.5)).toBe(15050);
		expect(toCents("150.50")).toBe(15050);
		expect(toCents(0)).toBe(0);
		expect(toCents(-42.1)).toBe(-4210);
	});

	it("rounds to the nearest cent rather than truncating", () => {
		// 1.005 * 100 is 100.49999999999999 in IEEE-754 double precision, so
		// this rounds down to 100, not 101 - a known float-input limitation
		// documented here rather than silently relied on.
		expect(toCents(1.005)).toBe(100);
		expect(toCents(19.999)).toBe(2000);
	});

	it("returns 0 for non-numeric input", () => {
		expect(toCents("not a number")).toBe(0);
		expect(toCents(null)).toBe(0);
		expect(toCents(undefined)).toBe(0);
	});
});

describe("fromCents", () => {
	it("converts integer cents back to a decimal value", () => {
		expect(fromCents(15050)).toBe(150.5);
		expect(fromCents(-4210)).toBe(-42.1);
		expect(fromCents(0)).toBe(0);
	});
});

describe("toCents/fromCents round-trip", () => {
	it("never drifts across repeated conversion, unlike float accumulation", () => {
		let cents = 0;
		for (let i = 0; i < 1000; i++) {
			cents += toCents(0.1);
		}
		// 1000 iterations of 0.1 (i.e. 10 cents) in naive float math drifts
		// off 10000 - integer cents arithmetic must be exact.
		expect(cents).toBe(10000);
		expect(fromCents(cents)).toBe(100);
	});
});

describe("sumCents", () => {
	it("sums cents, ignoring null/undefined", () => {
		expect(sumCents([100, null, 200, undefined, 50])).toBe(350);
		expect(sumCents([])).toBe(0);
	});
});

describe("formatMoney", () => {
	it("formats cents as a decimal string with two fraction digits", () => {
		expect(formatMoney(15050)).toBe("150.50");
		expect(formatMoney(0)).toBe("0.00");
	});

	it("formats with a currency symbol when a currency is given", () => {
		expect(formatMoney(15050, { currency: "USD", locale: "en-US" })).toContain(
			"150.50",
		);
	});
});
