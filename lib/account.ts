import { asc, count, eq, isNull } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";

export const getAccounts = cache((): Account[] => {
	return db
		.select()
		.from(accounts)
		.where(isNull(accounts.closed_at))
		.orderBy(asc(accounts.created_at))
		.all() as Account[];
});

export const getAllAccounts = cache((): Account[] => {
	return db
		.select()
		.from(accounts)
		.orderBy(asc(accounts.created_at))
		.all() as Account[];
});

export const getAccountById = cache((id: string): Account | null => {
	return (
		(db.select().from(accounts).where(eq(accounts.id, id)).get() as
			| Account
			| undefined) ?? null
	);
});

export const countAccountTransactions = cache((accountId: string): number => {
	return (
		db
			.select({ n: count() })
			.from(transactions)
			.where(eq(transactions.account_id, accountId))
			.get()?.n ?? 0
	);
});
