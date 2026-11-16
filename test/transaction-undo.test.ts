import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, refresh: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let actions: typeof import("@/app/actions/transaction/mutations");

beforeAll(async () => {
	ctx = await createTestDb();
	actions = await import("@/app/actions/transaction/mutations");
});

function addTransaction(
	accountId: string,
	values: Partial<typeof ctx.schema.transactions.$inferInsert> = {},
) {
	const id = randomUUID();
	ctx.db
		.insert(ctx.schema.transactions)
		.values({ id, account_id: accountId, date: "2026-03-10", ...values })
		.run();
	return id;
}

const rowsOf = (accountId: string) =>
	ctx.db
		.select()
		.from(ctx.schema.transactions)
		.where(eq(ctx.schema.transactions.account_id, accountId))
		.orderBy(ctx.schema.transactions.id)
		.all();

async function deleteRows(ids: string[]) {
	const result = await actions.bulkDeleteTransactions(ids);
	expect(result.success).toBe(true);
	return String(result.payload?.undoToken);
}

describe("undoing a transaction delete", () => {
	it("restores the deleted rows exactly, and the balance", async () => {
		const accountId = ctx.makeAccount({}, 10000);
		const kept = addTransaction(accountId, { payment: 500 });
		const removed = addTransaction(accountId, {
			payment: 2500,
			notes: "groceries",
			source: "email",
			status: "pending",
			external_hash: `hash-${randomUUID()}`,
		});
		const before = rowsOf(accountId);

		const token = await deleteRows([removed]);
		expect(rowsOf(accountId).map((row) => row.id)).not.toContain(removed);
		expect(rowsOf(accountId).map((row) => row.id)).toContain(kept);

		const undone = await actions.undoDeleteTransactions(token);
		expect(undone).toMatchObject({ success: true, payload: { restored: 1 } });
		expect(rowsOf(accountId)).toEqual(before);
		expect(ctx.balanceOf(accountId)).toBe(9500);
	});

	it("restores both legs of a transfer when one was deleted", async () => {
		const from = ctx.makeAccount({}, 50000);
		const to = ctx.makeAccount();
		const created = await actions.createTransfer({
			fromAccountId: from,
			toAccountId: to,
			amount: 200,
			date: "2026-03-11",
			notes: null,
		});
		expect(created.success).toBe(true);
		const [toLeg] = rowsOf(to);

		const token = await deleteRows([toLeg.id]);
		expect(rowsOf(to)).toHaveLength(0);
		expect(ctx.balanceOf(from)).toBe(50000);

		await actions.undoDeleteTransactions(token);
		expect(rowsOf(to)).toEqual([toLeg]);
		expect(ctx.balanceOf(from)).toBe(30000);
		expect(ctx.balanceOf(to)).toBe(20000);
	});

	it("rejects an unknown, reused or superseded token", async () => {
		const accountId = ctx.makeAccount();
		const first = await deleteRows([addTransaction(accountId)]);
		const second = await deleteRows([addTransaction(accountId)]);

		expect((await actions.undoDeleteTransactions("nope")).success).toBe(false);
		expect((await actions.undoDeleteTransactions(first)).success).toBe(false);
		expect((await actions.undoDeleteTransactions(second)).success).toBe(true);
		expect((await actions.undoDeleteTransactions(second)).success).toBe(false);
		expect(rowsOf(accountId)).toHaveLength(1);
	});

	it("restores nothing when a row can no longer be inserted", async () => {
		const accountId = ctx.makeAccount();
		const hash = `hash-${randomUUID()}`;
		const plain = addTransaction(accountId, { payment: 100 });
		const hashed = addTransaction(accountId, { external_hash: hash });
		const token = await deleteRows([plain, hashed]);
		addTransaction(accountId, { external_hash: hash });

		const undone = await actions.undoDeleteTransactions(token);
		expect(undone.success).toBe(false);
		expect(rowsOf(accountId)).toHaveLength(1);
	});
});
