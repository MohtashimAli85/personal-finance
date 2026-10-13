"use client";
import { createContext, use, useRef, useState } from "react";
import { createTransaction } from "@/app/actions/transaction/mutations";
import { toDateKey } from "@/lib/date";

interface TransactionContextType {
	transaction?: Omit<Transaction, "id">;
	initializeTransaction: () => void;
	cancelTransaction: () => void;
	updateTransaction: (updatedFields: Partial<Omit<Transaction, "id">>) => void;
	addTransaction: () => void;
}
const TransactionContext = createContext<TransactionContextType>(
	{} as TransactionContextType,
);
const initialTransaction = {
	payment: 0,
	deposit: 0,
	date: toDateKey(new Date()),
	notes: "",
	account_id: "",
	category_id: null as string | null,
};
export const useTransactionContext = () => use(TransactionContext);
const TransactionProvider = ({
	children,
	accountId = "",
	initialCategoryId = "",
	initialAccountId = "",
	initialDate,
	autoInitialize = false,
}: {
	children: React.ReactNode;
	accountId?: string;
	initialCategoryId?: string;
	initialAccountId?: string;
	initialDate?: string;
	autoInitialize?: boolean;
}) => {
	const [transaction, setTransaction] = useState<
		Omit<Transaction, "id"> | undefined
	>(
		autoInitialize
			? {
					...initialTransaction,
					date: initialDate ?? toDateKey(new Date()),
					account_id: accountId || initialAccountId,
					category_id: initialCategoryId || null,
				}
			: undefined,
	);
	const latest = useRef(transaction);
	const save = (next: Omit<Transaction, "id"> | undefined) => {
		latest.current = next;
		setTransaction(next);
	};
	const initializeTransaction = () => {
		save({
			...initialTransaction,
			date: initialDate ?? toDateKey(new Date()),
			account_id: accountId || initialAccountId,
			category_id: initialCategoryId || null,
		});
	};
	const cancelTransaction = () => {
		save(undefined);
	};
	const updateTransaction = (
		updatedFields: Partial<Omit<Transaction, "id">>,
	) => {
		if (latest.current) save({ ...latest.current, ...updatedFields });
	};
	const addTransaction = async () => {
		const tx = latest.current;
		if (!tx?.account_id) {
			return;
		}
		await createTransaction(tx);
		initializeTransaction();
	};
	return (
		<TransactionContext.Provider
			value={{
				transaction,
				initializeTransaction,
				cancelTransaction,
				updateTransaction,
				addTransaction,
			}}
		>
			{children}
		</TransactionContext.Provider>
	);
};

export default TransactionProvider;
