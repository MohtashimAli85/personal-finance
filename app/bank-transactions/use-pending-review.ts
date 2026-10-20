import { type TransitionStartFunction, useState } from "react";
import {
	acceptBankTransaction,
	rejectBankTransaction,
} from "@/app/actions/bank/sync";
import { toastOnError } from "@/lib/action-result";
import type { BankTransactionRow } from "@/lib/bank-transaction";

export function usePendingReview(
	transactions: BankTransactionRow[],
	startTransition: TransitionStartFunction,
) {
	const [acceptingId, setAcceptingId] = useState<string | null>(null);
	const [acceptCategory, setAcceptCategory] = useState<Record<string, string>>(
		{},
	);
	const pendingTransactions = transactions.filter(
		(t) => t.status === "pending",
	);

	const categoryFor = (t: BankTransactionRow) =>
		acceptCategory[t.id] ?? t.category_id ?? undefined;

	const setCategory = (id: string, value: string) =>
		setAcceptCategory((prev) => ({ ...prev, [id]: value }));

	const accept = (t: BankTransactionRow) => {
		setAcceptingId(t.id);
		startTransition(async () => {
			await toastOnError(
				acceptBankTransaction({ id: t.id, categoryId: categoryFor(t) ?? null }),
			);
			setAcceptingId(null);
		});
	};

	const reject = (t: BankTransactionRow) => {
		startTransition(async () => {
			await toastOnError(rejectBankTransaction(t.id));
		});
	};

	return {
		pendingTransactions,
		acceptingId,
		categoryFor,
		setCategory,
		accept,
		reject,
	};
}
