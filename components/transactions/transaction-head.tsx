import { TableHead } from "../ui/table";
import { HEAD_CELL, HEAD_LABEL } from "./transaction-cells";
import TransactionCheckbox from "./transaction-checkbox";
import TransactionSortHead from "./transaction-sort-head";

export default function TransactionHead({
	showAccountCell,
}: {
	showAccountCell: boolean;
}) {
	return (
		<tr>
			<TableHead className="h-9 w-10 pt-1 after:bg-border">
				<TransactionCheckbox shouldSelectAll />
			</TableHead>
			<TransactionSortHead column="date" label="Date" className="w-30" />
			{showAccountCell && (
				<TableHead className={`${HEAD_CELL} w-40`}>
					<span className={HEAD_LABEL}>Account</span>
				</TableHead>
			)}
			<TableHead className={`${HEAD_CELL} min-w-50`}>
				<span className={HEAD_LABEL}>Notes</span>
			</TableHead>
			<TableHead className={`${HEAD_CELL} w-40`}>
				<span className={HEAD_LABEL}>Category</span>
			</TableHead>
			<TransactionSortHead
				column="payment"
				label="Payment"
				alignEnd
				className="w-30"
			/>
			<TransactionSortHead
				column="deposit"
				label="Deposit"
				alignEnd
				className="w-30"
			/>
		</tr>
	);
}
