import { useTransactionSelection } from "@/context/transaction-selection-context";
import type { BankTransactionRow } from "@/lib/bank-transaction";

export function useSelectedPending(rows: BankTransactionRow[]) {
	const { isSelected } = useTransactionSelection();
	return rows.filter((t) => isSelected(t.id));
}
