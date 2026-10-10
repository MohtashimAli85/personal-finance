import { useState, useTransition } from "react";
import { holdForNextMonth, resetHold } from "@/app/actions/budget/mutations";
import { fromCents } from "@/lib/money";

export function useHoldForNextMonth(month: string, toBudget: number) {
	const [amount, setAmount] = useState(
		String(Math.max(fromCents(toBudget), 0)),
	);
	const [isPending, startTransition] = useTransition();

	const hold = (onDone?: () => void) =>
		startTransition(async () => {
			await holdForNextMonth(month, Number(amount || 0));
			onDone?.();
		});

	const reset = () => startTransition(() => resetHold(month));

	return { amount, setAmount, hold, reset, isPending };
}
