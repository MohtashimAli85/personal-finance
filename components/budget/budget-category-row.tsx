"use client";
import { Repeat } from "lucide-react";
import Link from "next/link";
import { renameBudgetCategory } from "@/app/actions/budget/mutations";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { toastOnError } from "@/lib/action-result";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import BalanceCell from "./balance-cell";
import BudgetCategoryMenu from "./budget-category-menu";
import { amountTone, CATEGORY_INDENT, NUMBER_CELL } from "./budget-cells";
import { categoryTransactionsHref } from "./category-href";
import DeleteCategoryDialog from "./delete-category-dialog";
import RecurringCategoryDialog from "./recurring-category-dialog";
import { useBudgetAmount } from "./use-budget-amount";
import { useCategoryRecurring } from "./use-category-recurring";
import { useDeleteCategory } from "./use-delete-category";

const BudgetCategoryRow = ({
	category,
	month,
}: {
	category: BudgetCategoryRow;
	month: string;
}) => {
	const { containerRef, startEditing, handleBlur, handleKeyDown } =
		useInlineEdit((value) => {
			toastOnError(
				renameBudgetCategory({ categoryId: category.id, name: value }),
			);
		});
	const amount = useBudgetAmount(category.id, month, category.budgeted);
	const href = categoryTransactionsHref(category.id, month);
	const remove = useDeleteCategory(category);
	const recurring = useCategoryRecurring(category);

	return (
		<TableRow className={cn("group", category.hidden && "opacity-50")}>
			<TableCell className={cn("h-8", CATEGORY_INDENT)}>
				<div className="flex items-center gap-1">
					<div ref={containerRef}>
						<input
							data-edit
							key={category.name}
							hidden
							defaultValue={category.name}
							className="outline-none"
							onBlur={handleBlur}
							onKeyDown={handleKeyDown}
						/>
						<Link data-view href={href} className="hover:underline">
							{category.name}
						</Link>
					</div>
					{category.recurring > 0 && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Repeat
									aria-label="Recurring"
									className="size-3 text-muted-foreground"
								/>
							</TooltipTrigger>
							<TooltipContent>
								Recurring {formatCurrency(category.recurring)} a month
							</TooltipContent>
						</Tooltip>
					)}
					<BudgetCategoryMenu
						onRename={startEditing}
						onRecurring={() => recurring.setOpen(true)}
						onDelete={remove.requestDelete}
					/>
				</div>
				<DeleteCategoryDialog
					category={category}
					open={remove.open}
					onOpenChange={remove.setOpen}
					transferToId={remove.transferToId}
					onTransferToChange={remove.setTransferToId}
					onConfirm={remove.confirmDelete}
					isPending={remove.isPending}
				/>
				<RecurringCategoryDialog category={category} recurring={recurring} />
			</TableCell>
			<TableCell className="h-8 p-0">
				<Input
					data-money
					variant="table"
					inputMode="decimal"
					className="h-8 rounded-sm px-[11px] text-right tabular-nums"
					key={category.budgeted}
					{...amount}
				/>
			</TableCell>
			<TableCell className={NUMBER_CELL}>
				<Link
					href={href}
					className={cn("hover:underline", amountTone(category.spent))}
					data-money
				>
					{formatCurrency(category.spent)}
				</Link>
			</TableCell>
			<TableCell className={NUMBER_CELL}>
				<BalanceCell category={category} month={month} />
			</TableCell>
		</TableRow>
	);
};

export default BudgetCategoryRow;
