"use client";

import { useTransactionSelection } from "@/context/transaction-selection-context";
import { useDeleteTransactions } from "./use-delete-transactions";

const CONFIRM_ABOVE = 25;

export function useDeleteSelected() {
	const { selectedIds, clearSelection } = useTransactionSelection();
	const { isPending, remove } = useDeleteTransactions();

	return {
		count: selectedIds.size,
		isPending,
		clearSelection,
		needsConfirm: selectedIds.size > CONFIRM_ABOVE,
		remove: () => remove(Array.from(selectedIds), clearSelection),
	};
}
