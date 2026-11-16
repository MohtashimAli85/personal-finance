import type { BankTransactionRow } from "@/lib/bank-transaction";
import { getMonthKey } from "@/lib/date";

export function useMonthSpent(transactions: BankTransactionRow[]) {
	const month = getMonthKey();
	return transactions
		.filter((t) => t.status !== "pending" && t.date?.startsWith(month))
		.reduce((sum, t) => sum + (t.payment ?? 0), 0);
}
