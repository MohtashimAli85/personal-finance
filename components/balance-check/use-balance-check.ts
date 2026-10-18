import { useState, useTransition } from "react";
import { saveBalanceCheck } from "@/app/actions/balance-check/mutations";
import { useIsOffBudget } from "@/components/transactions/use-is-off-budget";
import { toCents } from "@/lib/money";
import { useAmountRows } from "./use-amount-rows";

export function useBalanceCheck(appTotal: number, pendingTotal: number) {
	const actual = useAmountRows();
	const splits = useAmountRows();
	const [open, setOpen] = useState(false);
	const [accountId, setAccountId] = useState<string>();
	const [error, setError] = useState<string>();
	const [isSaving, startTransition] = useTransition();
	const offBudget = useIsOffBudget(accountId);

	const hasActual = actual.filled.length > 0;
	const difference = actual.total - appTotal;
	const differenceWithPending = difference - pendingTotal;
	const remaining = Math.abs(difference) - splits.total;
	const categorized = offBudget || splits.filled.every((row) => row.target);
	const canSave =
		hasActual &&
		remaining === 0 &&
		(difference === 0 || (!!accountId && categorized));

	const reset = () => {
		actual.reset();
		splits.reset();
		setError(undefined);
	};

	const changeOpen = (next: boolean) => {
		setOpen(next);
		if (!next) reset();
	};

	const save = () => {
		const sign = difference < 0 ? -1 : 1;
		const adjustments =
			difference === 0
				? []
				: splits.filled.map((row) => ({
						categoryId: offBudget ? null : row.target,
						amount: sign * toCents(row.amount),
					}));
		startTransition(async () => {
			const result = await saveBalanceCheck({
				accountId: accountId ?? null,
				adjustments,
			});
			if (!result.success) {
				setError(result.message);
				return;
			}
			changeOpen(false);
		});
	};

	return {
		actual,
		splits,
		open,
		changeOpen,
		accountId,
		setAccountId,
		hasActual,
		difference,
		differenceWithPending,
		remaining,
		canSave,
		isSaving,
		error,
		save,
	};
}
