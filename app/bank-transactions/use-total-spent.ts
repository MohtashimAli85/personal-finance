import type { BankTransactionRow } from "@/lib/bank-transaction";

export function useTotalSpent(transactions: BankTransactionRow[]) {
	return transactions.reduce((sum, t) => sum + (t.payment ?? 0), 0);
}
