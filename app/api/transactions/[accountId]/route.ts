import type { NextRequest } from "next/server";
import { getTransactions } from "../query";

export async function GET(req: NextRequest, ctx: Params) {
	const transactions = await getTransactions(req.nextUrl.searchParams, ctx);
	return Response.json(transactions);
}
