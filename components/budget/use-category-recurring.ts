import { useState } from "react";
import { setCategoryRecurring } from "@/app/actions/budget/mutations";
import { useServerAction } from "@/hooks/use-server-action";
import { fromCents } from "@/lib/money";

export function useCategoryRecurring(category: BudgetCategoryRow) {
	const [open, setOpenState] = useState(false);
	const [amount, setAmount] = useState("");
	const { isPending, run } = useServerAction();

	const setOpen = (next: boolean) => {
		if (next) setAmount(String(fromCents(category.recurring) || ""));
		setOpenState(next);
	};

	const submit = (value: string) =>
		run(
			() =>
				setCategoryRecurring({ categoryId: category.id, amount: value || 0 }),
			() => setOpenState(false),
		);

	return {
		open,
		setOpen,
		amount,
		setAmount,
		save: () => submit(amount),
		stop: () => submit(""),
		isPending,
	};
}
