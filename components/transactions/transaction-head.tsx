import { TableHead, TableRow } from "../ui/table";
import TransactionCheckbox from "./transaction-checkbox";

const TransactionHead = () => {
	return (
		<TableRow>
			<TableHead className="w-4">
				<TransactionCheckbox shouldSelectAll />
			</TableHead>
			<TableHead>Date</TableHead>
			<TableHead>Account</TableHead>
			<TableHead>Notes</TableHead>
			<TableHead>Category</TableHead>
			<TableHead className="text-right">Payment</TableHead>
			<TableHead className="text-right">Deposit</TableHead>
		</TableRow>
	);
};

export default TransactionHead;
