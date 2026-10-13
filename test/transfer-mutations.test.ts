import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let actions: typeof import("@/app/actions/transaction/mutations");
let balance: typeof import("@/lib/balance");

const ids = { a: randomUUID(), b: randomUUID(), c: randomUUID() };

beforeAll(async () => {
	ctx = await createTestDb();
	actions = await import("@/app/actions/transaction/mutations");
	balance = await import("@/lib/balance");
});

afterAll(() => ctx.cleanup());

beforeEach(() => {
	ctx.db.delete(ctx.schema.transactions).run();
	ctx.db.delete(ctx.schema.accounts).run();
	for (const [key, id] of Object.entries(ids)) {
		ctx.db
			.insert(ctx.schema.accounts)
			.values({ id, name: key, balance: 0 })
			.run();
	}
});

const balances = () =>
	Object.fromEntries(
		Object.entries(ids).map(([key, id]) => [
			key,
			ctx.db
				.select({ balance: ctx.schema.accounts.balance })
				.from(ctx.schema.accounts)
				.where(eq(ctx.schema.accounts.id, id))
				.get()?.balance,
		]),
	);

const legs = () => {
	const rows = ctx.db.select().from(ctx.schema.transactions).all();
	return {
		out: rows.find((r) => r.payment !== null),
		in: rows.find((r) => r.deposit !== null),
		count: rows.length,
	};
};

async function seedTransfer() {
	await actions.createTransfer({
		fromAccountId: ids.a,
		toAccountId: ids.b,
		amount: 100,
		date: "2026-10-01",
	});
	return legs();
}

function expectBalancesMatchRecompute() {
	const cached = balances();
	balance.recomputeAllBalances();
	expect(cached).toEqual(balances());
}

describe("transfer legs", () => {
	it("keeps both legs and balances consistent when one leg is edited", async () => {
		const { out } = await seedTransfer();

		await actions.updateTransactionColumn(out!.id, "payment", 250);
		let after = legs();
		expect(after.out?.payment).toBe(25000);
		expect(after.in?.deposit).toBe(25000);
		expectBalancesMatchRecompute();
		expect(balances()).toMatchObject({ a: -25000, b: 25000 });

		await actions.updateTransactionColumn(out!.id, "date", "2026-10-05");
		after = legs();
		expect(after.out?.date).toBe("2026-10-05");
		expect(after.in?.date).toBe("2026-10-05");

		await actions.updateTransactionColumn(after.in!.id, "deposit", 40);
		after = legs();
		expect(after.out?.payment).toBe(4000);
		expect(after.in?.deposit).toBe(4000);
		expectBalancesMatchRecompute();
		expect(balances()).toMatchObject({ a: -4000, b: 4000 });
	});

	it("moves only the edited leg when its account changes", async () => {
		const { out, in: inLeg } = await seedTransfer();

		await actions.updateTransactionColumn(out!.id, "account_id", ids.c);
		const after = legs();
		expect(after.out?.account_id).toBe(ids.c);
		expect(after.in?.account_id).toBe(inLeg!.account_id);
		expectBalancesMatchRecompute();
		expect(balances()).toMatchObject({ a: 0, b: 10000, c: -10000 });

		await expect(
			actions.updateTransactionColumn(out!.id, "account_id", ids.b),
		).rejects.toThrow();
	});

	it("deletes both legs and restores balances", async () => {
		const { out } = await seedTransfer();
		const form = new FormData();
		form.set("id", out!.id);

		await actions.deleteTransaction(form);
		expect(legs().count).toBe(0);
		expectBalancesMatchRecompute();
		expect(balances()).toMatchObject({ a: 0, b: 0 });
	});

	it("bulk delete removes the partner of each selected leg", async () => {
		const { out } = await seedTransfer();
		await actions.createTransaction({
			account_id: ids.a,
			category_id: null,
			payment: null,
			deposit: 500,
			date: "2026-10-02",
			notes: "salary",
		} as never);

		await actions.bulkDeleteTransactions([out!.id]);
		expect(legs().count).toBe(1);
		expectBalancesMatchRecompute();
		expect(balances()).toMatchObject({ a: 50000, b: 0 });
	});
});

describe("createTransaction", () => {
	it("rejects an invalid date instead of defaulting to today", async () => {
		await expect(
			actions.createTransaction({
				account_id: ids.a,
				category_id: null,
				payment: 5,
				deposit: null,
				date: "not a date",
				notes: null,
			} as never),
		).rejects.toThrow();
		expect(legs().count).toBe(0);
	});
});
