"use client";

import { Button } from "@/components/ui/button";
import { InputNumber } from "@/components/ui/input-number";
import { Label } from "@/components/ui/label";
import { PopoverContent } from "@/components/ui/popover";
import TransferTargetCombobox from "./transfer-target-combobox";
import { useTransferBudget } from "./use-transfer-budget";

const isInsideCombobox = (target: EventTarget | null) =>
	target instanceof Element &&
	Boolean(target.closest("[data-slot=combobox-content]"));

const isExpanded = (target: EventTarget | null) =>
	target instanceof Element && target.getAttribute("aria-expanded") === "true";

export default function TransferBudgetPopover({
	category,
	month,
	onDone,
}: {
	category: BudgetCategoryRow;
	month: string;
	onDone: () => void;
}) {
	const { amount, setAmount, toId, setToId, transfer, isPending, canSubmit } =
		useTransferBudget(category.id, month, category.balance, onDone);

	return (
		<PopoverContent
			align="end"
			className="w-64"
			onInteractOutside={(event) => {
				if (isInsideCombobox(event.target)) event.preventDefault();
			}}
			onEscapeKeyDown={(event) => {
				if (isExpanded(event.target)) event.preventDefault();
			}}
		>
			<form
				className="flex flex-col gap-3"
				onSubmit={(event) => {
					event.preventDefault();
					if (canSubmit) transfer();
				}}
			>
				<div className="flex flex-col gap-2">
					<Label htmlFor="transfer-amount">Transfer this amount:</Label>
					<InputNumber
						id="transfer-amount"
						autoFocus
						value={amount}
						onChange={setAmount}
					/>
				</div>
				<div className="flex flex-col gap-2">
					<Label htmlFor="transfer-to">To:</Label>
					<TransferTargetCombobox
						excludeId={category.id}
						value={toId}
						onChange={setToId}
					/>
				</div>
				<Button
					type="submit"
					size="sm"
					className="self-end"
					disabled={!canSubmit || isPending}
				>
					Transfer
				</Button>
			</form>
		</PopoverContent>
	);
}
