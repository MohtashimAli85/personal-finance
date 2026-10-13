import { useRouter } from "next/navigation";
import { type TransitionStartFunction, useState } from "react";
import {
	acceptBankTransaction,
	rejectBankTransaction,
} from "@/app/actions/bank/sync";
import type { BankTransactionRow } from "@/lib/bank-transaction";

export function usePendingReview(
	transactions: BankTransactionRow[],
	startTransition: TransitionStartFunction,
) {
	const router = useRouter();
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
			await acceptBankTransaction(t.id, categoryFor(t) ?? null);
			setAcceptingId(null);
			router.refresh();
		});
	};

	const reject = (t: BankTransactionRow) => {
		startTransition(async () => {
			await rejectBankTransaction(t.id);
			router.refresh();
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
