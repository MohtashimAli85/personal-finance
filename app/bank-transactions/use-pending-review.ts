import { type TransitionStartFunction, useState } from "react";
import {
	acceptBankTransactions,
	rejectBankTransactions,
} from "@/app/actions/bank/sync";
import { toastOnError } from "@/lib/action-result";
import type { BankTransactionRow } from "@/lib/bank-transaction";

export function usePendingReview(
	transactions: BankTransactionRow[],
	startTransition: TransitionStartFunction,
) {
	const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
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

	const run = (
		rows: BankTransactionRow[],
		action: () => Promise<ActionState>,
	) => {
		setBusyIds(new Set(rows.map((t) => t.id)));
		startTransition(async () => {
			await toastOnError(action());
			setBusyIds(new Set());
		});
	};

	const accept = (rows: BankTransactionRow[]) =>
		run(rows, () =>
			acceptBankTransactions(
				rows.map((t) => ({ id: t.id, categoryId: categoryFor(t) ?? null })),
			),
		);

	const reject = (rows: BankTransactionRow[]) =>
		run(rows, () => rejectBankTransactions(rows.map((t) => t.id)));

	return {
		pendingTransactions,
		busyIds,
		categoryFor,
		setCategory,
		accept,
		reject,
	};
}
