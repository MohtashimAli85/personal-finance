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
	transactions: Transaction[];
}) => {
	const transactionIds = useMemo(
		() => transactions.map((tx) => tx.id),
		[transactions],
	);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

	const toggleSelection = (id: string) => {
		setSelectedIds((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(id)) {
				newSet.delete(id);
			} else {
				newSet.add(id);
			}
			return newSet;
		});
	};

	const selectAll = () => {
		setSelectedIds(new Set(transactionIds));
	};

	const clearSelection = () => {
		setSelectedIds(new Set());
	};

	const isSelected = (id: string) => {
		return selectedIds.has(id);
	};
	const allSelected =
		transactionIds.length > 0 &&
		transactionIds.every((id) => selectedIds.has(id));
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
