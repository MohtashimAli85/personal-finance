import { cache } from "react";
import db from "@/app/actions/database";

const TRANSACTION_BASE_SELECT = `
  SELECT
    t.id, t.payment, t.deposit, t.date, t.notes,
    t.account_id, t.category_id,
    a.name AS account_name,
    c.name AS category_name
  FROM transactions t
  LEFT JOIN accounts a ON t.account_id = a.id
  LEFT JOIN categories c ON t.category_id = c.id
`;

export const getTransactions = cache(
	(searchParams: SearchParams): Paginated<TransactionRow> => {
		try {
			const conditions: string[] = [];
			const queryParams: (string | number)[] = [];
			const { accountId, categoryId, from, to, search } = searchParams;
			const limit = Number(searchParams.limit || "50");
			const offset = Number(searchParams.offset || "0");

			if (accountId) {
				conditions.push("t.account_id = ?");
				queryParams.push(accountId);
			}

			if (categoryId) {
				conditions.push("t.category_id = ?");
				queryParams.push(categoryId);
			}

			if (from) {
				conditions.push("t.date >= ?");
				queryParams.push(from);
			}

			if (to) {
				conditions.push("t.date <= ?");
				queryParams.push(to);
			}

			if (search) {
				conditions.push("(t.notes LIKE ? OR a.name LIKE ? OR c.name LIKE ?)");
				const pattern = `%${search}%`;
				queryParams.push(pattern, pattern, pattern);
			}

			const whereClause =
				conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

			// limit=0 means fetch all (used by export)
			if (limit === 0) {
				const sql = `${TRANSACTION_BASE_SELECT} ${whereClause} ORDER BY t.date DESC`;
				const rows = db.prepare(sql).all(...queryParams) as TransactionRow[];
				return { data: rows, hasMore: false };
			}

			const sql = `
        ${TRANSACTION_BASE_SELECT}
        ${whereClause}
        ORDER BY t.date DESC
        LIMIT ? OFFSET ?
      `;
			queryParams.push(limit + 1, offset || 0);

			const rows = db.prepare(sql).all(...queryParams) as TransactionRow[];
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
