import { useState } from "react";
import { holdForNextMonth, resetHold } from "@/app/actions/budget/mutations";
import { useServerAction } from "@/hooks/use-server-action";
import { fromCents } from "@/lib/money";

export function useHoldForNextMonth(month: string, toBudget: number) {
	const [amount, setAmount] = useState(
		String(Math.max(fromCents(toBudget), 0)),
	);
	const { isPending, run } = useServerAction();

	const hold = (onDone?: () => void) =>
		run(() => holdForNextMonth({ month, amount: amount || 0 }), onDone);

	const reset = () => run(() => resetHold(month));

	return { amount, setAmount, hold, reset, isPending };
}
