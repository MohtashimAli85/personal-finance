"use client";

import { Button } from "@/components/ui/button";
import { InputNumber } from "@/components/ui/input-number";
import { useHoldForNextMonth } from "./use-hold-for-next-month";

export default function HoldForNextMonth({
	view,
	onDone,
}: {
	view: BudgetView;
	onDone: () => void;
}) {
	const { amount, setAmount, hold, reset, isPending } = useHoldForNextMonth(
		view.month,
		view.toBudget,
	);

	return (
		<div className="space-y-2">
			{view.toBudget > 0 && (
				<form
					className="flex gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						hold(onDone);
					}}
				>
					<InputNumber
						value={amount}
						onChange={setAmount}
						aria-label="Amount to hold"
					/>
					<Button type="submit" size="sm" disabled={isPending}>
						Hold for next month
					</Button>
				</form>
			)}
			{view.buffered > 0 && (
				<Button
					variant="outline"
					size="sm"
					className="w-full"
					disabled={isPending}
					onClick={reset}
				>
					Reset next month&apos;s hold
				</Button>
			)}
		</div>
	);
}
