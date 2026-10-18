import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

function makeAccount(balance: number, closed = false) {
	const id = randomUUID();
	ctx.db
		.insert(ctx.schema.accounts)
		.values({
			id,
			name: `Check ${id}`,
			balance,
			closed_at: closed ? "2026-01-01" : null,
		})
		.run();
	return id;
}

function makeCategory() {
	const groupId = randomUUID();
	const id = randomUUID();
	ctx.db
		.insert(ctx.schema.category_group)
		.values({ id: groupId, name: `Group ${groupId}` })
		.run();
	ctx.db
		.insert(ctx.schema.categories)
		.values({ id, name: `Category ${id}`, group_id: groupId })
		.run();
	return id;
}

const balanceOf = (accountId: string) =>
	ctx.db
		.select({ balance: ctx.schema.accounts.balance })
		.from(ctx.schema.accounts)
		.where(eq(ctx.schema.accounts.id, accountId))
		.get()?.balance;

describe("balance check", () => {
	it("books adjustments as cleared transactions and marks verified", async () => {
		const { saveBalanceCheck } = await import(
			"@/app/actions/balance-check/mutations"
		);
		const { getBalanceVerifiedAt } = await import("@/lib/balance-check");
		const accountId = makeAccount(100000);
		const food = makeCategory();
		const salary = makeCategory();

		const result = await saveBalanceCheck({
			accountId,
			adjustments: [
				{ categoryId: food, amount: -3000 },
				{ categoryId: salary, amount: 500 },
			],
		});

		expect(result.success).toBe(true);
		expect(balanceOf(accountId)).toBe(97500);
		const rows = ctx.db
			.select()
			.from(ctx.schema.transactions)
			.where(eq(ctx.schema.transactions.account_id, accountId))
			.all();
		expect(rows).toHaveLength(2);
		expect(rows.find((row) => row.category_id === food)).toMatchObject({
			payment: 3000,
			deposit: null,
			status: "cleared",
			notes: "Balance adjustment",
		});
		expect(rows.find((row) => row.category_id === salary)?.deposit).toBe(500);
		expect(getBalanceVerifiedAt()).not.toBeNull();
	});

	it("requires an account when there are adjustments", async () => {
		const { saveBalanceCheck } = await import(
			"@/app/actions/balance-check/mutations"
		);
		const result = await saveBalanceCheck({
			accountId: null,
			adjustments: [{ categoryId: null, amount: -100 }],
		});
		expect(result.success).toBe(false);
	});

	it("sums pending rows of open accounts only", async () => {
		const { getPendingTotal } = await import("@/lib/balance-check");
		const before = getPendingTotal();
		const open = makeAccount(0);
		const closed = makeAccount(0, true);
		for (const [accountId, payment] of [
			[open, 2500],
			[closed, 9999],
		] as const) {
			ctx.db
				.insert(ctx.schema.transactions)
				.values({
					id: randomUUID(),
					account_id: accountId,
					payment,
					date: "2026-10-01",
					status: "pending",
				})
				.run();
		}
		expect(getPendingTotal() - before).toBe(-2500);
	});
});
