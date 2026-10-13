import { useState, useTransition } from "react";
import { deleteBudgetCategory } from "@/app/actions/budget/mutations";

export function useDeleteCategory(category: BudgetCategoryRow) {
	const [open, setOpen] = useState(false);
	const [transferToId, setTransferToId] = useState("");
	const [isPending, startTransition] = useTransition();

	const remove = (toId: string | null) =>
		startTransition(async () => {
			await deleteBudgetCategory(category.id, toId);
			setOpen(false);
		});

	return {
		open,
		setOpen,
		transferToId,
		setTransferToId,
		isPending,
		requestDelete: () => (category.in_use ? setOpen(true) : remove(null)),
		confirmDelete: () => remove(transferToId),
	};
}
