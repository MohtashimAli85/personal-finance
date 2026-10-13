import { useState, useTransition } from "react";
import { transferBetweenCategories } from "@/app/actions/budget/mutations";
import { fromCents } from "@/lib/money";

export function useTransferBudget(
	fromId: string,
	month: string,
	balance: number,
	onDone: () => void,
) {
	const [amount, setAmount] = useState(String(Math.max(fromCents(balance), 0)));
	const [toId, setToId] = useState("");
	const [isPending, startTransition] = useTransition();

	const transfer = () =>
		startTransition(async () => {
			await transferBetweenCategories(fromId, toId, month, Number(amount || 0));
			onDone();
		});

	return {
		amount,
		setAmount,
		toId,
		setToId,
		transfer,
		isPending,
		canSubmit: Boolean(toId) && Number(amount) > 0,
	};
}
