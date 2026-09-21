import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "./db-test-utils";

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

function makeAccount(name: string, initialBalance = 0) {
	const { db, schema } = ctx;
	const id = randomUUID();
	db.insert(schema.accounts)
		.values({ id, name, balance: initialBalance })
		.run();
	return id;
}

describe("balance recompute", () => {
	it("rebuilds an account's balance from the sum of its transactions", async () => {
		const { db, schema } = ctx;
		const { applyBalanceDelta, signedAmount, recomputeAccountBalance } =
			await import("@/lib/balance");

		const accountId = makeAccount("Recompute Test", 999999); // deliberately wrong cache

		db.insert(schema.transactions)
			.values([
				{
					id: randomUUID(),
					account_id: accountId,
					payment: 5000,
					date: "2026-01-01",
				},
				{
					id: randomUUID(),
					account_id: accountId,
					deposit: 2000,
					date: "2026-01-02",
				},
				{
					id: randomUUID(),
					account_id: accountId,
					payment: 300,
					date: "2026-01-03",
				},
			])
			.run();

		const recomputed = recomputeAccountBalance(accountId);
		// -5000 + 2000 - 300 = -3300
		expect(recomputed).toBe(-3300);

		const raw = ctx.sqlite
			.prepare("select balance from accounts where id = ?")
			.get(accountId) as any;
		expect(raw.balance).toBe(-3300);

		expect(applyBalanceDelta).toBeTypeOf("function");
		expect(signedAmount(5000, 2000)).toBe(-3000);
	});

	it("signedAmount treats payment as negative and deposit as positive", async () => {
		const { signedAmount } = await import("@/lib/balance");
		expect(signedAmount(100, null)).toBe(-100);
		expect(signedAmount(null, 100)).toBe(100);
		expect(signedAmount(null, null)).toBe(0);
		expect(signedAmount(100, 100)).toBe(0);
	});
});
