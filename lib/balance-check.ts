import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";
import { getSetting } from "@/lib/settings";

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
