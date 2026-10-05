import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";

/** Net signed effect of a transaction on its account's balance, in cents. */
export function signedAmount(
	payment?: number | null,
	deposit?: number | null,
): number {
	return (deposit ?? 0) - (payment ?? 0);
}

/** Applies a cents delta to one account's cached balance. */
export function applyBalanceDelta(accountId?: string | null, delta = 0) {
	if (!accountId || delta === 0) return;
	db.update(accounts)
		.set({ balance: sql`${accounts.balance} + ${delta}` })
		.where(eq(accounts.id, accountId))
		.run();
}

/**
 * Rebuilds one account's cached balance from the sum of its transactions.
 * `accounts.balance` is a cache for read performance - this is the source of
 * truth recompute, safe to run at any time (e.g. after a bug, a manual DB
 * edit, or a migration) to correct any drift.
 */
export function recomputeAccountBalance(accountId: string): number {
	const row = db
		.select({
			total: sql<number>`coalesce(sum(coalesce(${transactions.deposit},0) - coalesce(${transactions.payment},0)), 0)`,
		})
		.from(transactions)
		.where(eq(transactions.account_id, accountId))
		.get();
	const total = Number(row?.total ?? 0);
	db.update(accounts)
		.set({ balance: total })
		.where(eq(accounts.id, accountId))
		.run();
	return total;
}

/** Recomputes every account's balance from its transactions. Returns the count updated. */
export function recomputeAllBalances(): number {
	const ids = db.select({ id: accounts.id }).from(accounts).all();
	db.transaction(() => {
		for (const { id } of ids) recomputeAccountBalance(id);
	});
	return ids.length;
}
