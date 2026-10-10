"use client";
import Link from "next/link";
import {
	deleteBudgetCategory,
	renameBudgetCategory,
} from "@/app/actions/budget/mutations";
import { InputNumber } from "@/components/ui/input-number";
import { TableCell, TableRow } from "@/components/ui/table";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import BalanceCell from "./balance-cell";
import BudgetCategoryMenu from "./budget-category-menu";
import { categoryTransactionsHref } from "./category-href";
import { useBudgetAmount } from "./use-budget-amount";

const BudgetCategoryRow = ({
	category,
	month,
}: {
	category: BudgetCategoryRow;
	month: string;
}) => {
	const { containerRef, startEditing, handleBlur, handleKeyDown } =
		useInlineEdit((value) => {
			renameBudgetCategory(category.id, value);
		});
	const amount = useBudgetAmount(category.id, month, category.budgeted);
	const href = categoryTransactionsHref(category.id, month);

	return (
		<TableRow className={cn("group", category.hidden && "opacity-50")}>
			<TableCell>
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
					<BudgetCategoryMenu
						onRename={startEditing}
						onDelete={() => deleteBudgetCategory(category.id)}
					/>
				</div>
			</TableCell>
			<TableCell className="text-right">
				<InputNumber
					variant="table"
					className="max-w-28"
					key={category.budgeted}
					{...amount}
				/>
			</TableCell>
			<TableCell className="text-right">
				<Link href={href} className="hover:underline" data-money>
					{formatCurrency(category.spent)}
				</Link>
			</TableCell>
			<TableCell className="text-right">
				<BalanceCell category={category} month={month} />
			</TableCell>
		</TableRow>
	);
};

export default BudgetCategoryRow;
