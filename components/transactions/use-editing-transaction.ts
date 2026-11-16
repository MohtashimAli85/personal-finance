"use client";

import { useState } from "react";

export function useEditingTransaction(transactions: TransactionRow[]) {
	const [editingId, setEditingId] = useState<string | null>(null);

	return {
		editing: transactions.find((tx) => tx.id === editingId) ?? null,
		open: setEditingId,
		close: () => setEditingId(null),
	};
}
