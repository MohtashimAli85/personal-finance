"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { fromCents } from "@/lib/money";
import TransactionSheetFields from "./transaction-sheet-fields";
import { useDeleteTransactions } from "./use-delete-transactions";
import { useTransactionEdit } from "./use-transaction-edit";

const decimal = (cents: number | null) => (cents ? fromCents(cents) : "");

export default function EditForm({
	tx,
	showAccount,
	onClose,
}: {
	tx: TransactionRow;
	showAccount: boolean;
	onClose: () => void;
}) {
	const update = useTransactionEdit(tx.id);
	const { isPending, remove } = useDeleteTransactions();

	return (
		<>
			<SheetHeader>
				<SheetTitle>Edit transaction</SheetTitle>
				<SheetDescription>
					{tx.status === "pending"
						? "Pending review. Changes save as you go."
						: "Changes save as you go."}
				</SheetDescription>
			</SheetHeader>
			<div className="px-4">
				<TransactionSheetFields
					resetKeys={{
						notes: `${tx.notes}`,
						payment: `${tx.payment}`,
						deposit: `${tx.deposit}`,
					}}
					date={tx.date}
					onDateChange={(date) => update("date", date)}
					account={
						showAccount
							? {
									value: tx.account_id ?? undefined,
									label: tx.account_name ?? undefined,
									onChange: (value) => update("account_id", value),
								}
							: undefined
					}
					category={{
						accountId: tx.account_id,
						value: tx.category_id ?? undefined,
						label: tx.category_name ?? undefined,
						onChange: (value) => update("category_id", value),
					}}
					notes={{
						defaultValue: tx.notes ?? "",
						onBlur: (e) => {
							if (e.target.value !== (tx.notes ?? "")) {
								update("notes", e.target.value);
							}
						},
					}}
					payment={{
						defaultValue: decimal(tx.payment),
						onBlur: (e) => {
							if (e.target.value !== String(decimal(tx.payment))) {
								update("payment", e.target.value);
							}
						},
					}}
					deposit={{
						defaultValue: decimal(tx.deposit),
						onBlur: (e) => {
							if (e.target.value !== String(decimal(tx.deposit))) {
								update("deposit", e.target.value);
							}
						},
					}}
				/>
			</div>
			<SheetFooter className="flex-row justify-between">
				<Button
					variant="destructive"
					disabled={isPending}
					onClick={() => remove([tx.id], onClose)}
				>
					<Trash2 />
					Delete
				</Button>
				<Button onClick={onClose}>Done</Button>
			</SheetFooter>
		</>
	);
}
