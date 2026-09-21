import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts } from "@/lib/db/schema";

export function signedAmount(
	payment?: number | null,
	deposit?: number | null,
): number {
	return (deposit ?? 0) - (payment ?? 0);
}

export function applyBalanceDelta(accountId?: string | null, delta = 0) {
	if (!accountId || delta === 0) return;
	db.update(accounts)
		.set({ balance: sql`coalesce(${accounts.balance}, 0) + ${delta}` })
		.where(eq(accounts.id, accountId))
		.run();
}
