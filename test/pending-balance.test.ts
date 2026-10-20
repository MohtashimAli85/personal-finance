import { randomUUID } from "node:crypto";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, refresh: () => {} }));
vi.mock("next/headers", () => ({
	cookies: async () => ({ get: () => undefined }),
}));

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

const makeAccount = (balance: number) => ctx.makeAccount({}, balance);

function addPending(accountId: string, payment: number) {
	const id = randomUUID();
	ctx.db
		.insert(ctx.schema.transactions)
		.values({
			id,
			account_id: accountId,
			payment,
			date: "2026-08-01",
			source: "email",
			status: "pending",
		})
		.run();
	return id;
}

const balanceOf = (accountId: string) => ctx.balanceOf(accountId);

describe("pending transactions and account balance", () => {
	it("balance ignores pending rows", async () => {
		const accountId = makeAccount(0);
		ctx.db
			.insert(ctx.schema.transactions)
			.values({
				id: randomUUID(),
				account_id: accountId,
				deposit: 10000,
				date: "2026-08-01",
			})
			.run();
		addPending(accountId, 4000);

		expect(balanceOf(accountId)).toBe(10000);
	});

	it("accepting a pending row applies it, rejecting or deleting one does not", async () => {
		const { acceptBankTransaction, rejectBankTransaction } = await import(
			"@/app/actions/bank/sync"
		);
		const { bulkDeleteTransactions } = await import(
			"@/app/actions/transaction/mutations"
		);
		const accountId = makeAccount(10000);

		await rejectBankTransaction(addPending(accountId, 1000));
		expect(balanceOf(accountId)).toBe(10000);

		await bulkDeleteTransactions([addPending(accountId, 2000)]);
		expect(balanceOf(accountId)).toBe(10000);

		await acceptBankTransaction({ id: addPending(accountId, 3000) });
		expect(balanceOf(accountId)).toBe(7000);
	});
});
