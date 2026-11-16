import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	like,
	lt,
	or,
	type SQL,
	sql,
} from "drizzle-orm";
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
	source: transactions.source,
	status: transactions.status,
	transfer_id: transactions.transfer_id,
	account_name: accounts.name,
	category_name: categories.name,
};

const transactionQuery = () =>
	db
		.select(transactionSelect)
		.from(transactions)
		.leftJoin(accounts, eq(transactions.account_id, accounts.id))
		.leftJoin(categories, eq(transactions.category_id, categories.id));

function transactionFilter({
	accountId,
	categoryId,
	from,
	to,
	search,
}: SearchParams) {
	const conditions: SQL[] = [];

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
		// `to` is an exclusive upper bound (e.g. the first day of the next
		// month), matching lib/date.ts getMonthRange - see budget-category-row.
		conditions.push(lt(transactions.date, to));
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

	return conditions.length > 0 ? and(...conditions) : undefined;
}

const SORTABLE_AMOUNTS = {
	payment: transactions.payment,
	deposit: transactions.deposit,
};

function transactionOrder({ sort, dir }: SearchParams) {
	const direction = dir === "asc" ? asc : desc;
	if (sort === "date") return [direction(transactions.date)];
	if (sort !== "payment" && sort !== "deposit") {
		return [desc(transactions.date)];
	}
	const column = SORTABLE_AMOUNTS[sort];
	return [sql`${column} is null`, direction(column), desc(transactions.date)];
}

export interface TransactionTotals {
	count: number;
	pending: number;
	payment: number;
	deposit: number;
}

/** Totals for everything the filters match, not just the loaded page.
 * payment/deposit are integer cents. */
export const getTransactionTotals = cache(
	(searchParams: SearchParams): TransactionTotals => {
		const row = db
			.select({
				count: count(),
				pending: sql<number>`coalesce(sum(${transactions.status} = 'pending'), 0)`,
				payment: sql<number>`coalesce(sum(${transactions.payment}), 0)`,
				deposit: sql<number>`coalesce(sum(${transactions.deposit}), 0)`,
			})
			.from(transactions)
			.leftJoin(accounts, eq(transactions.account_id, accounts.id))
			.leftJoin(categories, eq(transactions.category_id, categories.id))
			.where(transactionFilter(searchParams))
			.get();
		return {
			count: Number(row?.count ?? 0),
			pending: Number(row?.pending ?? 0),
			payment: Number(row?.payment ?? 0),
			deposit: Number(row?.deposit ?? 0),
		};
	},
);

export const getTransactions = cache(
	(searchParams: SearchParams): Paginated<TransactionRow> => {
		try {
			const limit = Number(searchParams.limit || "50");
			const offset = Number(searchParams.offset || "0");
			const whereClause = transactionFilter(searchParams);
			const order = transactionOrder(searchParams);

			// limit=0 means fetch all (used by export)
			if (limit === 0) {
				const rows = transactionQuery()
					.where(whereClause)
					.orderBy(...order)
					.all();
				return { data: rows, hasMore: false };
			}

			const rows = transactionQuery()
				.where(whereClause)
				.orderBy(...order)
				.limit(limit + 1)
				.offset(offset || 0)
				.all();
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
