import { useState } from "react";
import { deleteBudgetCategory } from "@/app/actions/budget/mutations";
import { useServerAction } from "@/hooks/use-server-action";

export function useDeleteCategory(category: BudgetCategoryRow) {
	const [open, setOpen] = useState(false);
	const [transferToId, setTransferToId] = useState("");
	const { isPending, run } = useServerAction();

	const remove = (toId: string | null) =>
		run(
			() =>
				deleteBudgetCategory({ categoryId: category.id, transferToId: toId }),
			() => setOpen(false),
		);

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
