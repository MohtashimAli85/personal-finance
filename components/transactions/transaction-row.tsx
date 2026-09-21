"use client";
import { memo, useState } from "react";
import { updateTransactionColumn } from "@/app/actions/transaction/mutations";
import AccountSelector from "@/components/accounts/account-combobox";
import { TableCell, TableRow } from "@/components/ui/table";
import { useTransactionSelection } from "@/context/transaction-selection-context";
import { fromCents } from "@/lib/money";
import CategoryCombobox from "../categories/category-combobox";
import { Input } from "../ui/input";
import { InputNumber } from "../ui/input-number";
import TransactionCheckbox from "./transaction-checkbox";
import { TransactionDatePicker } from "./transaction-date-picker";

const TransactionRowInner = ({
	tx,
	showAccountCell,
}: {
	tx: TransactionRow;
	showAccountCell?: boolean;
}) => {
	const { isSelected } = useTransactionSelection();
	// Locally controlled so typing doesn't write to the DB on every
	// keystroke - only on blur/Enter, once the user is done editing.
	const [notes, setNotes] = useState(tx.notes ?? "");

	return (
		<TableRow
			className="group"
			data-state={isSelected(tx.id) ? "selected" : "default"}
			data-status={tx.status === "pending" ? "pending" : undefined}
		>
			<TableCell className="w-4 pl-2">
				<TransactionCheckbox id={tx.id} />
			</TableCell>
			<TableCell>
				<TransactionDatePicker
					date={tx.date}
					onSelect={(date) => updateTransactionColumn(tx.id, "date", date)}
				/>
			</TableCell>
			{showAccountCell && (
				<TableCell>
					<AccountSelector
						variant={"table"}
						value={tx.account_id ?? undefined}
						label={tx.account_name ?? undefined}
						onChange={(value) =>
							updateTransactionColumn(tx.id, "account_id", value)
						}
					/>
				</TableCell>
			)}
			<TableCell>
				<Input
					key={`notes-${tx.notes}`}
					variant={"table"}
					placeholder="Notes"
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					onBlur={() => {
						if (notes !== (tx.notes ?? "")) {
							updateTransactionColumn(tx.id, "notes", notes);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
				/>
			</TableCell>
			<TableCell>
				<CategoryCombobox
					value={tx.category_id ?? undefined}
					label={tx.category_name ?? undefined}
					onChange={(value) =>
						updateTransactionColumn(tx.id, "category_id", value)
					}
				/>
			</TableCell>
			<TableCell className="text-right">
				<InputNumber
					variant={"table"}
					key={`payment-${tx.payment}`}
					defaultValue={tx.payment ? fromCents(tx.payment) : undefined}
					placeholder="0"
					onBlur={(e) => {
						const currentDecimal = tx.payment ? fromCents(tx.payment) : "";
						if (e.target.value !== String(currentDecimal))
							updateTransactionColumn(tx.id, "payment", e.target.value);
					}}
				/>
			</TableCell>
			<TableCell className="text-right">
				<InputNumber
					key={`deposit-${tx.deposit}`}
					variant={"table"}
					defaultValue={tx.deposit ? fromCents(tx.deposit) : undefined}
					placeholder="0"
					onBlur={(e) => {
						const currentDecimal = tx.deposit ? fromCents(tx.deposit) : "";
						if (e.target.value !== String(currentDecimal))
							updateTransactionColumn(tx.id, "deposit", e.target.value);
					}}
				/>
			</TableCell>
		</TableRow>
	);
};

const MemoizedTransactionRow = memo(TransactionRowInner, (prev, next) => {
	return (
		prev.tx.id === next.tx.id &&
		prev.tx.date === next.tx.date &&
		prev.tx.notes === next.tx.notes &&
		prev.tx.payment === next.tx.payment &&
		prev.tx.deposit === next.tx.deposit &&
		prev.tx.account_id === next.tx.account_id &&
		prev.tx.category_id === next.tx.category_id &&
		prev.tx.account_name === next.tx.account_name &&
		prev.tx.category_name === next.tx.category_name &&
		prev.showAccountCell === next.showAccountCell
	);
});
MemoizedTransactionRow.displayName = "TransactionRow";

export default MemoizedTransactionRow;
