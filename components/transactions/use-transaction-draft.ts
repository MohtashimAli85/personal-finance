import { useRef, useState } from "react";
import { toast } from "sonner";
import { createTransaction } from "@/app/actions/transaction/mutations";
import { useServerAction } from "@/hooks/use-server-action";
import { toDateKey } from "@/lib/date";

/** A transaction being typed in. payment/deposit are decimals as entered,
 * not cents - the server action converts them. */
export interface TransactionDraft {
	payment: number;
	deposit: number;
	date: string;
	notes: string;
	account_id: string;
	category_id: string | null;
}

export interface TransactionDraftOptions {
	accountId?: string;
	initialCategoryId?: string;
	initialAccountId?: string;
	initialDate?: string;
	autoInitialize?: boolean;
}

export function useTransactionDraft({
	accountId = "",
	initialCategoryId = "",
	initialAccountId = "",
	initialDate,
	autoInitialize = false,
}: TransactionDraftOptions) {
	const fresh = (): TransactionDraft => ({
		payment: 0,
		deposit: 0,
		notes: "",
		date: initialDate ?? toDateKey(new Date()),
		account_id: accountId || initialAccountId,
		category_id: initialCategoryId || null,
	});
	const [transaction, setTransaction] = useState<TransactionDraft | undefined>(
		() => (autoInitialize ? fresh() : undefined),
	);
	const latest = useRef(transaction);
	const { run } = useServerAction();

	const save = (next: TransactionDraft | undefined) => {
		latest.current = next;
		setTransaction(next);
	};
	const initializeTransaction = () => save(fresh());
	const cancelTransaction = () => save(undefined);
	const updateTransaction = (fields: Partial<TransactionDraft>) => {
		if (latest.current) save({ ...latest.current, ...fields });
	};
	const addTransaction = (keepOpen = true) => {
		const tx = latest.current;
		if (!tx) return;
		if (!tx.account_id) {
			toast.error("Choose an account for this transaction.");
			return;
		}
		run(
			() => createTransaction(tx),
			keepOpen ? initializeTransaction : cancelTransaction,
		);
	};

	return {
		transaction,
		initializeTransaction,
		cancelTransaction,
		updateTransaction,
		addTransaction,
	};
}
