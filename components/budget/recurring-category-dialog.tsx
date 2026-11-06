"use client";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { InputNumber } from "@/components/ui/input-number";
import type { useCategoryRecurring } from "./use-category-recurring";

export default function RecurringCategoryDialog({
	category,
	recurring,
}: {
	category: BudgetCategoryRow;
	recurring: ReturnType<typeof useCategoryRecurring>;
}) {
	const { open, setOpen, amount, setAmount, save, stop, isPending } = recurring;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Recurring amount for {category.name}</DialogTitle>
					<DialogDescription>
						Each month, once income comes in, this amount is budgeted from To
						Budget automatically.
					</DialogDescription>
				</DialogHeader>
				<form
					id="recurring-amount"
					onSubmit={(event) => {
						event.preventDefault();
						save();
					}}
				>
					<InputNumber
						value={amount}
						onChange={setAmount}
						aria-label="Monthly amount"
						autoFocus
					/>
				</form>
				<DialogFooter>
					{category.recurring > 0 && (
						<Button variant="outline" disabled={isPending} onClick={stop}>
							Stop recurring
						</Button>
					)}
					<Button type="submit" form="recurring-amount" disabled={isPending}>
						Save
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
