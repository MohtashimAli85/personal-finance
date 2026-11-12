import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

const spend = (
	account_id: string,
	date: string,
	payment: number,
	extra: Partial<typeof ctx.schema.transactions.$inferInsert> = {},
) =>
	ctx.db
		.insert(ctx.schema.transactions)
		.values({ id: randomUUID(), account_id, date, payment, ...extra })
		.run();

describe("getDailySpend", () => {
	it("splits today, yesterday and the month-to-date daily average", async () => {
		const { getDailySpend } = await import("@/lib/dashboard");
		const wallet = ctx.makeAccount({ name: "Wallet" });
		const offBudget = ctx.makeAccount({
			name: "Brokerage",
			account_type: "off_budget",
		});

		spend(wallet, "2026-11-01", 30_00);
		spend(wallet, "2026-11-09", 20_00);
		spend(wallet, "2026-11-10", 15_00);
		spend(wallet, "2026-11-10", 5_00, { status: "pending" });
		spend(wallet, "2026-11-11", 40_00);
		spend(wallet, "2026-11-20", 99_00);
		spend(wallet, "2026-10-31", 77_00);
		spend(offBudget, "2026-11-11", 500_00);

		expect(getDailySpend(new Date(2026, 10, 11, 9, 30))).toEqual({
			today: 40_00,
			yesterday: 15_00,
			average: Math.round(105_00 / 11 / 100) * 100,
		});
	});
});

const row = (id: string, spent: number, balance: number) =>
	({ id, name: id, spent, balance }) as BudgetCategoryRow;

const view = {
	groups: [
		{ categories: [row("rent", -500_00, 0), row("food", -120_00, -20_00)] },
		{ categories: [row("pocket", -80_00, -5_00), row("savings", 0, 300_00)] },
	],
} as BudgetView;

describe("getHouseSpend", () => {
	it("sums category spending except the excluded categories", async () => {
		const { getHouseSpend } = await import("@/lib/dashboard");
		expect(getHouseSpend(view, [])).toBe(700_00);
		expect(getHouseSpend(view, ["pocket"])).toBe(620_00);
	});
});

describe("getOverspent", () => {
	it("totals negative balances and reports the worst category", async () => {
		const { getOverspent } = await import("@/lib/dashboard");
		const result = getOverspent(view);
		expect(result.total).toBe(25_00);
		expect(result.count).toBe(2);
		expect(result.worst?.id).toBe("food");
	});
});
