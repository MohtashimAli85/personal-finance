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

export const getTransactions = async (
	searchParams: URLSearchParams,
	query?: Params,
) => {
	try {
		const params = await query?.params;
		const conditions: string[] = [];
		const queryParams: (string | number)[] = [];
		const accountId =
			searchParams.get("accountId") || params?.accountId?.toString();
		const categoryId = searchParams.get("categoryId");
		const from = searchParams.get("from");
		const to = searchParams.get("to");
		const search = searchParams.get("search");
		const limit = Number(searchParams.get("limit") || "100");
		const offset = Number(searchParams.get("offset") || "0");
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

		const dbQuery = `
        ${TRANSACTION_BASE_SELECT}
        ${whereClause}
        ORDER BY t.date DESC
        LIMIT ? OFFSET ?
        `;

		queryParams.push(limit || 100, offset || 0);

		return db.prepare(dbQuery).all(...queryParams);
	} catch (error) {
		console.error("Error fetching transactions:", error);
		return [];
	}
};
