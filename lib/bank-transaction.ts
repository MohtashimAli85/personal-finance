import { desc, eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { accounts, categories, transactions } from "@/lib/db/schema";

export interface BankTransactionRow {
	id: string;
	payment: number | null;
	deposit: number | null;
	date: string | null;
	notes: string | null;
	account_id: string | null;
	account_name: string | null;
	category_id: string | null;
	category_name: string | null;
	source: string;
	status: string;
}

export const getBankTransactions = cache((): BankTransactionRow[] => {
	const rows = db
		.select({
			id: transactions.id,
			payment: transactions.payment,
			deposit: transactions.deposit,
			date: transactions.date,
			notes: transactions.notes,
			account_id: transactions.account_id,
			account: accounts.name,
			category_id: transactions.category_id,
			category: categories.name,
			source: transactions.source,
			status: transactions.status,
		})
		.from(transactions)
		.innerJoin(accounts, eq(transactions.account_id, accounts.id))
		.leftJoin(categories, eq(transactions.category_id, categories.id))
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
		account_id: r.account_id,
		account_name: r.account,
		category_id: r.category_id,
		category_name: r.category,
		source: r.source,
		status: r.status,
	}));
});
