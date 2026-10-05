import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;
let actions: typeof import("@/app/actions/transaction/mutations");

function seedAccount(name: string) {
	const id = randomUUID();
	ctx.db
		.insert(ctx.schema.accounts)
		.values({ id, name, balance: 100_000_00 })
		.run();
	return id;
}

function seedExisting(
	accountId: string,
	date: string,
	payment: number,
	notes: string | null,
) {
	ctx.db
		.insert(ctx.schema.transactions)
		.values({
			id: randomUUID(),
			account_id: accountId,
			date,
			payment,
			notes,
			source: "import",
		})
		.run();
}

const balanceOf = (accountId: string) =>
	ctx.db
		.select()
		.from(ctx.schema.accounts)
		.where(eq(ctx.schema.accounts.id, accountId))
		.get()?.balance;

const countFor = (accountId: string) =>
	ctx.db
		.select()
		.from(ctx.schema.transactions)
		.where(eq(ctx.schema.transactions.account_id, accountId))
		.all().length;

beforeAll(async () => {
	ctx = await createTestDb();
	actions = await import("@/app/actions/transaction/mutations");
});

afterAll(() => ctx.cleanup());

describe("CSV import duplicate detection", () => {
	it("skips rows already in the account even when they were added without a hash", async () => {
		const accountId = seedAccount("Migrated");
		seedExisting(accountId, "2026-09-20", 24_000, "Roti");
		seedExisting(accountId, "2026-09-21", 150_000, null);

		const rows = [
			{ date: "2026-09-20", payment: 240, notes: "roti " },
			{ date: "2026-09-21", payment: 1500 },
			{ date: "2026-10-02", payment: 500, notes: "Milk" },
		];

		expect(await actions.previewImport(accountId, rows)).toEqual({
			newCount: 1,
			duplicates: 2,
		});
		expect(await actions.bulkImportTransactions(accountId, rows)).toEqual({
			inserted: 1,
			duplicates: 2,
		});
		expect(countFor(accountId)).toBe(3);
		expect(balanceOf(accountId)).toBe(100_000_00 - 500_00);
	});

	it("keeps genuinely repeated rows and is idempotent on re-import", async () => {
		const accountId = seedAccount("Repeats");
		const rows = [
			{ date: "2026-10-04", payment: 240, notes: "Roti" },
			{ date: "2026-10-04", payment: 240, notes: "Roti" },
			{ date: "2026-10-04", deposit: 1000 },
		];

		expect(await actions.bulkImportTransactions(accountId, rows)).toEqual({
			inserted: 3,
			duplicates: 0,
		});
		expect(await actions.bulkImportTransactions(accountId, rows)).toEqual({
			inserted: 0,
			duplicates: 3,
		});

		const withOneMore = [
			...rows,
			{ date: "2026-10-04", payment: 240, notes: "Roti" },
		];
		expect(await actions.previewImport(accountId, withOneMore)).toEqual({
			newCount: 1,
			duplicates: 3,
		});
		expect(countFor(accountId)).toBe(3);
	});

	it("only matches within the chosen account", async () => {
		const a = seedAccount("A");
		const b = seedAccount("B");
		seedExisting(a, "2026-10-01", 10_000, "Fuel");
		expect(
			await actions.previewImport(b, [
				{ date: "2026-10-01", payment: 100, notes: "Fuel" },
			]),
		).toEqual({ newCount: 1, duplicates: 0 });
	});
});
