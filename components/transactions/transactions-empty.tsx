"use client";

import { TableCell, TableRow } from "@/components/ui/table";
import { useTransactionContext } from "@/context/transaction-context";
import TransactionsEmptyState from "./transactions-empty-state";

export default function TransactionsEmpty({ colSpan }: { colSpan: number }) {
	const { transaction } = useTransactionContext();
	if (transaction) return null;

	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={colSpan} className="whitespace-normal py-16">
				<TransactionsEmptyState />
			</TableCell>
		</TableRow>
	);
}
