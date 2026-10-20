"use server";

import { refresh } from "next/cache";
import { refineBankTransactions } from "@/lib/bank-ai-refine";

export async function refineBankTransactionsWithAi() {
	const result = await refineBankTransactions();
	refresh();
	return result;
}
