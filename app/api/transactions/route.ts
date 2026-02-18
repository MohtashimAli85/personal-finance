import type { NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
	const searchParams = request.nextUrl.searchParams;
	const conditions: string[] = [];
	const params: (string | number)[] = [];

	// Directly access the first element of the arrays
	const accountId = searchParams.get("accountId");
	const categoryId = searchParams.get("categoryId");
	const startDate = searchParams.get("startDate");
	const endDate = searchParams.get("endDate");
	const search = searchParams.get("search");
	const limit = Number(searchParams.get("limit") || "100");
	const offset = Number(searchParams.get("offset") || "0");

	if (accountId) {
		conditions.push("t.account_id = ?");
		params.push(accountId);
	}

	if (categoryId) {
		conditions.push("t.category_id = ?");
		params.push(categoryId);
	}

	if (startDate) {
		conditions.push("t.date >= ?");
		params.push(startDate);
	}

	if (endDate) {
		conditions.push("t.date <= ?");
		params.push(endDate);
	}

	if (search) {
		conditions.push("(t.notes LIKE ? OR a.name LIKE ? OR c.name LIKE ?)");
		const pattern = `%${search}%`;
		params.push(pattern, pattern, pattern);
	}

	const whereClause =
		conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

	const query = `
        ${TRANSACTION_BASE_SELECT}
        ${whereClause}
        ORDER BY t.date DESC
        LIMIT ? OFFSET ?
    `;

	params.push(limit, offset);

	return Response.json(db.prepare(query).all(...params));
}
