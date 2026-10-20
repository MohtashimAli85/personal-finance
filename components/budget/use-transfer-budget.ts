import { useState } from "react";
import { transferBetweenCategories } from "@/app/actions/budget/mutations";
import { useServerAction } from "@/hooks/use-server-action";
import { fromCents } from "@/lib/money";

export function useTransferBudget(
	fromId: string,
	month: string,
	balance: number,
	onDone: () => void,
) {
	const [amount, setAmount] = useState(String(Math.max(fromCents(balance), 0)));
	const [toId, setToId] = useState("");
	const { isPending, run } = useServerAction();

	const transfer = () =>
		run(
			() =>
				transferBetweenCategories({ fromId, toId, month, amount: amount || 0 }),
			onDone,
		);

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
