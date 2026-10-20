import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { createTestDb } from "./db-test-utils";

vi.mock("next/cache", () => ({ revalidatePath: () => {}, refresh: () => {} }));

let ctx: Awaited<ReturnType<typeof createTestDb>>;

beforeAll(async () => {
	ctx = await createTestDb();
});

const sumOfTransactions = (accountId: string) =>
	Number(
		ctx.db.get<{ total: number }>(
			sql`select coalesce(sum(coalesce(deposit, 0) - coalesce(payment, 0)), 0) as total
				from transactions where account_id = ${accountId} and status != 'pending'`,
		)?.total ?? 0,
	);

describe("account balance", () => {
	it("always equals the sum of cleared transactions across mixed writes", async () => {
		const tx = await import("@/app/actions/transaction/mutations");
		const bank = await import("@/app/actions/bank/sync");
		const accounts = await import("@/app/actions/accounts/mutations");
		const { getAccounts } = await import("@/lib/account");

		const a = ctx.makeAccount({ name: "Wallet" }, 1_000_00);
		const b = ctx.makeAccount({ name: "Bank" });
		const c = ctx.makeAccount({ name: "Savings" });

		await tx.createTransaction({
			account_id: a,
			payment: "250.50",
			date: "2026-10-01",
		});
		await tx.createTransfer({
			fromAccountId: a,
			toAccountId: b,
			amount: 100,
			date: "2026-10-02",
		});
		const rows = ctx.db.select().from(ctx.schema.transactions).all();
		const spend = rows.find((row) => row.payment === 250_50);
		const out = rows.find((row) => row.source === "transfer" && row.payment);
		if (!spend || !out) throw new Error("seed rows missing");

		await tx.updateTransactionColumn({
			id: spend.id,
			column: "deposit",
			value: 20,
		});
		await tx.updateTransactionColumn({
			id: out.id,
			column: "account_id",
			value: c,
		});

		const pending = randomUUID();
		ctx.db
			.insert(ctx.schema.transactions)
			.values({
				id: pending,
				account_id: b,
				payment: 30_00,
				date: "2026-10-03",
				status: "pending",
			})
			.run();
		expect(ctx.balanceOf(b)).toBe(100_00);
		await bank.acceptBankTransaction({ id: pending });

		const doomed = randomUUID();
		ctx.db
			.insert(ctx.schema.transactions)
			.values({ id: doomed, account_id: a, payment: 5_00, date: "2026-10-04" })
			.run();
		await tx.bulkDeleteTransactions([doomed]);

		await accounts.archiveAccount({ id: c, transferAccountId: a });

		expect(ctx.balanceOf(a)).toBe(1_000_00 + 20_00 - 100_00);
		expect(ctx.balanceOf(b)).toBe(100_00 - 30_00);
		expect(ctx.balanceOf(c)).toBe(0);
		for (const id of [a, b, c]) {
			expect(ctx.balanceOf(id)).toBe(sumOfTransactions(id));
		}
		expect(getAccounts().map((account) => account.id)).not.toContain(c);
	});
});
