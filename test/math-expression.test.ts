import { describe, expect, it } from "vitest";
import { evaluateExpression } from "@/lib/math-expression";

describe("evaluateExpression", () => {
	it("follows operator precedence and brackets", () => {
		expect(evaluateExpression("10+20-30*4/2")).toBe(-30);
		expect(evaluateExpression("(10+20)*2")).toBe(60);
		expect(evaluateExpression("2*(3+(4-1))/3")).toBe(4);
		expect(evaluateExpression("10-2-3")).toBe(5);
		expect(evaluateExpression("12/4/3")).toBe(1);
	});

	it("handles decimals, leading zeros, unary minus and spaces", () => {
		expect(evaluateExpression("1.5+.5+2.")).toBe(4);
		expect(evaluateExpression("010+05")).toBe(15);
		expect(evaluateExpression("-5+10")).toBe(5);
		expect(evaluateExpression("5--3")).toBe(8);
		expect(evaluateExpression(" 100 / 4 ")).toBe(25);
	});

	it("returns null for anything that isn't valid arithmetic", () => {
		for (const input of [
			"",
			"10+",
			"*5",
			"(1+2",
			"1+2)",
			"1/0",
			"1..2",
			"2 3",
			"alert(1)",
			"1e5",
		]) {
			expect(evaluateExpression(input)).toBeNull();
		}
	});
});
