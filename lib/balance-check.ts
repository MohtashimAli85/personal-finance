import { and, eq, isNull, sql } from "drizzle-orm";
import { toDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { getSetting, setSetting } from "@/lib/settings";
import { createTransactionRecord } from "@/lib/transaction-mutations";
import { UserError } from "@/lib/user-error";

export const BALANCE_VERIFIED_KEY = "balance_verified_at";

export function getPendingTotal(): number {
	const row = db
		.select({
			total: sql<number>`coalesce(sum(coalesce(${transactions.deposit},0) - coalesce(${transactions.payment},0)), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(accounts.id, transactions.account_id))
		.where(and(eq(transactions.status, "pending"), isNull(accounts.closed_at)))
		.get();
	return Number(row?.total ?? 0);
}

export const getBalanceVerifiedAt = () => getSetting(BALANCE_VERIFIED_KEY);

/** Records the user's check against the bank: each adjustment (signed cents)
 * becomes a transaction, then the check is timestamped. */
export function saveBalanceCheckRecord(
	accountId: string | null,
	adjustments: { categoryId: string | null; amount: number }[],
) {
	const nonZero = adjustments.filter((adjustment) => adjustment.amount !== 0);
	if (nonZero.length > 0 && !accountId) {
		throw new UserError("Pick an account for the adjustments.");
	}
	const date = toDateKey(new Date());
	db.transaction(() => {
		for (const { categoryId, amount } of nonZero) {
			createTransactionRecord({
				account_id: accountId,
				category_id: categoryId,
				payment: amount < 0 ? -amount : null,
				deposit: amount > 0 ? amount : null,
				date,
				notes: "Balance adjustment",
				source: "manual",
				status: "cleared",
			});
		}
		setSetting(BALANCE_VERIFIED_KEY, new Date().toISOString());
	});
}
