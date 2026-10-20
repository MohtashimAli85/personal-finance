import {
	asc,
	count,
	desc,
	eq,
	getTableColumns,
	isNull,
	type SQL,
	sql,
} from "drizzle-orm";
import { cache } from "react";
import { accountBalance } from "@/lib/balance";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";

const selectAccounts = (where?: SQL) =>
	db
		.select({ ...getTableColumns(accounts), balance: accountBalance })
		.from(accounts)
		.where(where)
		.orderBy(asc(accounts.created_at))
		.all();

export const getAccounts = cache((): Account[] =>
	selectAccounts(isNull(accounts.closed_at)),
);

export const getAllAccounts = cache((): Account[] => selectAccounts());

export const getAccountById = cache(
	(id: string): Account | null =>
		selectAccounts(eq(accounts.id, id))[0] ?? null,
);

export const countAccountTransactions = cache((accountId: string): number => {
	return (
		db
			.select({ n: count() })
			.from(transactions)
			.where(eq(transactions.account_id, accountId))
			.get()?.n ?? 0
	);
});

export const getDefaultAccountId = cache((): string | null => {
	const lastUsed = db
		.select({ id: accounts.id })
		.from(transactions)
		.innerJoin(accounts, eq(accounts.id, transactions.account_id))
		.where(isNull(accounts.closed_at))
		.orderBy(desc(transactions.date), desc(sql`${transactions}.rowid`))
		.limit(1)
		.get();
	return lastUsed?.id ?? getAccounts()[0]?.id ?? null;
});
