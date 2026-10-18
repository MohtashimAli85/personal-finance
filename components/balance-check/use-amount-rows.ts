import { useState } from "react";
import { toCents } from "@/lib/money";

export interface AmountRow {
	id: string;
	target: string;
	amount: string;
}

const newRow = (): AmountRow => ({
	id: crypto.randomUUID(),
	target: "",
	amount: "",
});

export function useAmountRows() {
	const [rows, setRows] = useState<AmountRow[]>(() => [newRow()]);

	const add = () => setRows((current) => [...current, newRow()]);
	const remove = (id: string) =>
		setRows((current) => current.filter((row) => row.id !== id));
	const update = (id: string, patch: Partial<AmountRow>) =>
		setRows((current) =>
			current.map((row) => (row.id === id ? { ...row, ...patch } : row)),
		);
	const reset = () => setRows([newRow()]);

	const filled = rows.filter((row) => toCents(row.amount) !== 0);
	const total = filled.reduce((sum, row) => sum + toCents(row.amount), 0);

	return { rows, filled, total, add, remove, update, reset };
}

export type AmountRows = ReturnType<typeof useAmountRows>;
