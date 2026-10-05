import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";

/**
 * Income/expense for on-budget accounts within [from, to). Cents. Transfers
 * between the user's own accounts and pending (unreviewed) imports are
 * excluded so moving your own money, or an import nobody has looked at yet,
 * never inflates these figures.
 */
export const getSummary = cache((from: string, to: string): SummaryResponse => {
	const row = db
		.select({
			income: sql<number>`coalesce(sum(${transactions.deposit}), 0)`,
			expense: sql<number>`coalesce(sum(${transactions.payment}), 0)`,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(
			and(
				gte(transactions.date, from),
				lt(transactions.date, to),
				eq(accounts.account_type, "on_budget"),
				eq(transactions.status, "cleared"),
				isNull(transactions.transfer_id),
			),
		)
		.get();

	return {
		income: Number(row?.income || 0),
		expense: Number(row?.expense || 0),
	};
});
