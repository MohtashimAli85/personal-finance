"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { useTransactionSelection } from "@/context/transaction-selection-context";
import { cn } from "@/lib/tailwindcss/utils";

const TransactionCheckbox = ({
	id,
	shouldSelectAll,
}: {
	id?: string;
	shouldSelectAll?: boolean;
}) => {
	const {
		isSelected,
		toggleSelection,
		selectAll,
		clearSelection,
		allSelected,
	} = useTransactionSelection();

	return (
		<Checkbox
			className={cn(
				id && "opacity-0 group-hover:opacity-100 data-checked:opacity-100",
				{},
			)}
			checked={id ? isSelected(id) : shouldSelectAll ? allSelected : false}
			onCheckedChange={() =>
				shouldSelectAll
					? allSelected
						? clearSelection()
						: selectAll()
					: id
						? toggleSelection(id)
						: void 0
			}
		/>
	);
};

export default TransactionCheckbox;
