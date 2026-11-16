"use client";
import { createContext, use, useMemo, useState } from "react";

interface TransactionSelectionContextType {
	selectedIds: Set<string>;
	toggleSelection: (id: string) => void;
	selectAll: () => void;
	clearSelection: () => void;
	isSelected: (id: string) => boolean;
	allSelected: boolean;
}

const TransactionSelectionContext =
	createContext<TransactionSelectionContextType>(
		{} as TransactionSelectionContextType,
	);

export const useTransactionSelection = () => use(TransactionSelectionContext);

export const TransactionSelectionProvider = ({
	children,
	transactions,
}: {
	children: React.ReactNode;
	transactions: { id: string }[];
}) => {
	const transactionIds = useMemo(
		() => transactions.map((tx) => tx.id),
		[transactions],
	);
	const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
	const selectedIds = new Set(
		transactionIds.filter((id) => checkedIds.has(id)),
	);

	const toggleSelection = (id: string) => {
		setCheckedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const selectAll = () => setCheckedIds(new Set(transactionIds));
	const clearSelection = () => setCheckedIds(new Set());
	const isSelected = (id: string) => checkedIds.has(id);
	const allSelected =
		transactionIds.length > 0 && selectedIds.size === transactionIds.length;

	return (
		<TransactionSelectionContext.Provider
			value={{
				selectedIds,
				toggleSelection,
				selectAll,
				clearSelection,
				isSelected,
				allSelected,
			}}
		>
			{children}
		</TransactionSelectionContext.Provider>
	);
};
