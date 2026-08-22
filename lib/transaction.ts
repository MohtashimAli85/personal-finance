import { and, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { accounts, categories, transactions } from "@/lib/db/schema";

const transactionSelect = {
	id: transactions.id,
	payment: transactions.payment,
	deposit: transactions.deposit,
	date: transactions.date,
	notes: transactions.notes,
	account_id: transactions.account_id,
	category_id: transactions.category_id,
	account_name: accounts.name,
	category_name: categories.name,
};

const transactionQuery = () =>
	db
		.select(transactionSelect)
		.from(transactions)
		.leftJoin(accounts, eq(transactions.account_id, accounts.id))
		.leftJoin(categories, eq(transactions.category_id, categories.id));

export const getTransactions = cache(
	(searchParams: SearchParams): Paginated<TransactionRow> => {
		try {
			const conditions: SQL[] = [];
			const { accountId, categoryId, from, to, search } = searchParams;
			const limit = Number(searchParams.limit || "50");
			const offset = Number(searchParams.offset || "0");

			if (accountId) {
				conditions.push(eq(transactions.account_id, accountId));
			}

			if (categoryId) {
				conditions.push(eq(transactions.category_id, categoryId));
			}

			if (from) {
				conditions.push(gte(transactions.date, from));
			}

			if (to) {
				conditions.push(lte(transactions.date, to));
			}

			if (search) {
				const pattern = `%${search}%`;
				const searchCondition = or(
					like(transactions.notes, pattern),
					like(accounts.name, pattern),
					like(categories.name, pattern),
				);
				if (searchCondition) conditions.push(searchCondition);
			}

			const whereClause =
				conditions.length > 0 ? and(...conditions) : undefined;

			// limit=0 means fetch all (used by export)
			if (limit === 0) {
				const rows = transactionQuery()
					.where(whereClause)
					.orderBy(desc(transactions.date))
					.all() as TransactionRow[];
				return { data: rows, hasMore: false };
			}

			const rows = transactionQuery()
				.where(whereClause)
				.orderBy(desc(transactions.date))
				.limit(limit + 1)
				.offset(offset || 0)
				.all() as TransactionRow[];
			const hasMore = rows.length > limit;

			return {
				data: hasMore ? rows.slice(0, limit) : rows,
				hasMore,
			};
		} catch (error) {
			console.error("Error fetching transactions:", error);
			return { data: [], hasMore: false };
		}
	},
);
