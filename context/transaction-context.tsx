"use client";
import { createContext, use } from "react";
import {
	type TransactionDraftOptions,
	useTransactionDraft,
} from "@/components/transactions/use-transaction-draft";

type TransactionContextType = ReturnType<typeof useTransactionDraft>;

const TransactionContext = createContext<TransactionContextType>(
	{} as TransactionContextType,
);

export const useTransactionContext = () => use(TransactionContext);

const TransactionProvider = ({
	children,
	...options
}: TransactionDraftOptions & { children: React.ReactNode }) => {
	const draft = useTransactionDraft(options);
	return (
		<TransactionContext.Provider value={draft}>
			{children}
		</TransactionContext.Provider>
	);
};

export default TransactionProvider;
