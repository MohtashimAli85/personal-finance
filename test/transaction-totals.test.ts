import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, refresh: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

function addTransaction(
	accountId: string,
	values: Partial<typeof ctx.schema.transactions.$inferInsert>,
) {
	ctx.db
		.insert(ctx.schema.transactions)
		.values({
			id: randomUUID(),
			account_id: accountId,
			date: "2026-03-10",
			...values,
		})
		.run();
}

describe("getTransactionTotals", () => {
	it("totals every matching row, not just the loaded page", async () => {
		const { getTransactionTotals, getTransactions } = await import(
			"@/lib/transaction"
		);
		const accountId = ctx.makeAccount();
		addTransaction(accountId, { payment: 1500, notes: "coffee beans" });
		addTransaction(accountId, { payment: 2500, notes: "coffee shop" });
		addTransaction(accountId, { deposit: 10000, notes: "salary" });
		addTransaction(accountId, {
			payment: 700,
			notes: "coffee pending",
			status: "pending",
		});

		const all = getTransactionTotals({ accountId });
		expect(all).toEqual({
			count: 4,
			pending: 1,
			payment: 4700,
			deposit: 10000,
		});

		const coffee = { accountId, search: "coffee", limit: "1" };
		expect(getTransactions(coffee).data).toHaveLength(1);
		expect(getTransactionTotals(coffee)).toMatchObject({
			count: 3,
			payment: 4700,
			deposit: 0,
		});
	});

	it("respects the date range with an exclusive end", async () => {
		const { getTransactionTotals } = await import("@/lib/transaction");
		const accountId = ctx.makeAccount();
		addTransaction(accountId, { payment: 100, date: "2026-03-01" });
		addTransaction(accountId, { payment: 200, date: "2026-03-31" });
		addTransaction(accountId, { payment: 400, date: "2026-04-01" });

		expect(
			getTransactionTotals({ accountId, from: "2026-03-01", to: "2026-04-01" }),
		).toMatchObject({ count: 2, payment: 300 });
	});
});
