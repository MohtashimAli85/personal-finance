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
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import ExpenseCategoryOptions from "./expense-category-options";
import { useCategoryGoal } from "./use-category-goal";

export default function DeleteCategoryDialog({
	category,
	open,
	onOpenChange,
	transferToId,
	onTransferToChange,
	onConfirm,
	isPending,
}: {
	category: BudgetCategoryRow;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	transferToId: string;
	onTransferToChange: (id: string) => void;
	onConfirm: () => void;
	isPending: boolean;
}) {
	const goalName = useCategoryGoal(category.id, open);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete {category.name}</DialogTitle>
					<DialogDescription>
						{goalName
							? `This category is linked to the goal "${goalName}". Delete the goal before deleting the category.`
							: "This category has transactions or budgeted money. Pick a category to move them to so your balances stay the same."}
					</DialogDescription>
				</DialogHeader>
				{!goalName && (
					<Select value={transferToId} onValueChange={onTransferToChange}>
						<SelectTrigger className="w-full">
							<SelectValue placeholder="Transfer to category" />
						</SelectTrigger>
						<SelectContent>
							<ExpenseCategoryOptions excludeId={category.id} />
						</SelectContent>
					</Select>
				)}
				<DialogFooter>
					<Button
						variant="destructive"
						disabled={!transferToId || isPending || !!goalName}
						onClick={onConfirm}
					>
						Transfer and delete
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
