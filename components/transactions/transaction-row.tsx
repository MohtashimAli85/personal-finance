"use client";
import { updateTransactionColumn } from "@/app/actions/transaction/mutations";
import type { TransactionRow as TransactionRowType } from "@/app/actions/transaction/queries";
import AccountSelector from "@/components/accounts/account-combobox";
import { TableCell, TableRow } from "@/components/ui/table";
import { useTransactionSelection } from "@/context/transaction-selection-context";
import CategoryCombobox from "../categories/category-combobox";
import { Input } from "../ui/input";
import { InputNumber } from "../ui/input-number";
import TransactionCheckbox from "./transaction-checkbox";
import { TransactionDatePicker } from "./transaction-date-picker";

const TransactionRow = ({ tx }: { tx: TransactionRowType }) => {
	const { isSelected } = useTransactionSelection();
	return (
		<TableRow
			className="group"
			data-state={isSelected(tx.id) ? "selected" : "default"}
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
			<TableCell>
				<AccountSelector
					variant={"table"}
					value={tx.account_id}
					label={tx.account_name}
					onChange={(value) =>
						updateTransactionColumn(tx.id, "account_id", value)
					}
				/>
			</TableCell>
			<TableCell>
				<Input
					variant={"table"}
					placeholder="Notes"
					id="notes"
					value={tx.notes}
					onChange={(e) =>
						updateTransactionColumn(tx.id, e.target.id, e.target.value)
					}
				/>
			</TableCell>
			<TableCell>
				<CategoryCombobox
					value={tx.category_id}
					label={tx.category_name}
					onChange={(value) =>
						updateTransactionColumn(tx.id, "category_id", value)
					}
				/>
			</TableCell>
			<TableCell className="text-right">
				<InputNumber
					variant={"table"}
					defaultValue={tx.payment}
					placeholder="0"
					id="payment"
					onBlur={(e) => {
						if (e.target.value !== String(tx.payment))
							updateTransactionColumn(tx.id, e.target.id, e.target.value);
					}}
				/>
			</TableCell>
			<TableCell className="text-right">
				<InputNumber
					variant={"table"}
					defaultValue={tx.deposit}
					placeholder="0"
					id="deposit"
					onBlur={(e) => {
						if (e.target.value !== String(tx.deposit))
							updateTransactionColumn(tx.id, e.target.id, e.target.value);
					}}
				/>
			</TableCell>
		</TableRow>
	);
};

export default TransactionRow;
