import type { NextRequest } from "next/server";
import { getTransactions } from "./query";

export async function GET(request: NextRequest) {
	const transactions = await getTransactions(request.nextUrl.searchParams);
	return Response.json(transactions);
}
