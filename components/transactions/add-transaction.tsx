"use client";
import { useTransactionContext } from "@/context/transaction-context";
import AccountCombobox from "../accounts/account-combobox";
import CategoryCombobox from "../categories/category-combobox";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { InputNumber } from "../ui/input-number";
import { TableCell, TableRow } from "../ui/table";
import { TransactionDatePicker } from "./transaction-date-picker";
export const AddTransactionButton = () => {
	const { initializeTransaction } = useTransactionContext();
	return (
		<Button key="add-transaction-button" onClick={initializeTransaction}>
			Add Transaction
		</Button>
	);
};

export const AddTransactionRow = () => {
	const {
		transaction: tx,
		cancelTransaction,
		updateTransaction,
		addTransaction,
	} = useTransactionContext();
	if (!tx) return null;
	return (
		<>
			<TableRow
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						const target = e.target as HTMLElement;
						if (target.tagName === "INPUT") {
							addTransaction();
						}
					}
				}}
			>
				<TableCell className="w-12">{/* Empty cell for checkbox column */}</TableCell>
				<TableCell>
					<TransactionDatePicker
						date={tx.date}
						onSelect={(date) => updateTransaction({ date })}
						defaultOpen
					/>
				</TableCell>
				<TableCell>
					<AccountCombobox
						value={tx.account_id}
						onChange={(value) => updateTransaction({ account_id: value })}
						variant={"table"}
					/>
				</TableCell>
				<TableCell>
					<Input
						placeholder="Notes"
						value={tx.notes}
						onChange={(e) => updateTransaction({ notes: e.target.value })}
						variant={"table"}
					/>
				</TableCell>
				<TableCell>
					<CategoryCombobox
						value={tx.category_id}
						onChange={(value) => updateTransaction({ category_id: value })}
					/>
				</TableCell>
				<TableCell className="text-right">
					<InputNumber
						variant={"table"}
						placeholder="0"
						value={tx.payment}
						onChange={(payment) =>
							updateTransaction({ payment: Number(payment), deposit: 0 })
						}
					/>
				</TableCell>
				<TableCell className="text-right">
					<InputNumber
						variant={"table"}
						placeholder="0"
						value={tx.deposit}
						onChange={(deposit) =>
							updateTransaction({ payment: 0, deposit: Number(deposit) })
						}
					/>
				</TableCell>
			</TableRow>
			<tr className="py-3 border-b border-primary">
				<td colSpan={7} className="text-right py-3">
					<div className="flex gap-2 justify-end">
						<Button onClick={cancelTransaction} variant={"outline"}>
							Cancel
						</Button>
						<form action={addTransaction}>
							<Button type="submit">Add</Button>
						</form>
					</div>
				</td>
			</tr>
		</>
	);
};
