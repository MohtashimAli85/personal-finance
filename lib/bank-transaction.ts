import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { accounts, transactions } from "@/lib/db/schema";

export interface BankTransactionRow {
	id: string;
	payment: number | null;
	deposit: number | null;
	date: string | null;
	notes: string | null;
	account_name: string | null;
	category_name: string | null;
	source: string;
}

export const getBankTransactions = cache((): BankTransactionRow[] => {
	const rows = db
		.select({
			id: transactions.id,
			payment: transactions.payment,
			deposit: transactions.deposit,
			date: transactions.date,
			notes: transactions.notes,
			account: accounts.name,
			source: transactions.source,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.where(eq(transactions.source, "email"))
		.orderBy(desc(transactions.date))
		.limit(200)
		.all();

	return rows.map((r) => ({
		id: r.id,
		payment: r.payment,
		deposit: r.deposit,
		date: r.date,
		notes: r.notes,
		account_name: r.account,
		category_name: null,
		source: r.source,
	}));
});
