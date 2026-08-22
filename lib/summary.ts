import { and, gte, lt, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";

export const getSummary = cache((from: string, to: string): SummaryResponse => {
	const row = db
		.select({
			income: sql<number>`coalesce(sum(${transactions.deposit}), 0)`,
			expense: sql<number>`coalesce(sum(${transactions.payment}), 0)`,
		})
		.from(transactions)
		.where(and(gte(transactions.date, from), lt(transactions.date, to)))
		.get();

	return {
		income: Number(row?.income || 0),
		expense: Number(row?.expense || 0),
	};
});
