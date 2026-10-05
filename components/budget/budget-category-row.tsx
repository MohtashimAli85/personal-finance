"use client";
import Link from "next/link";
import {
	deleteBudgetCategory,
	renameBudgetCategory,
	setBudgetedAmount,
} from "@/app/actions/budget/mutations";
import { InputNumber } from "@/components/ui/input-number";
import { TableCell, TableRow } from "@/components/ui/table";
import { useInlineEdit } from "@/hooks/use-inline-edit";
import { getMonthRange } from "@/lib/date";
import { formatCurrency } from "@/lib/helper";
import { fromCents } from "@/lib/money";
import BudgetCategoryMenu from "./budget-category-menu";

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

	const { start, end } = getMonthRange(month);
	const linkHref = `/transactions?${new URLSearchParams({
		categoryId: category.id,
		from: start,
		to: end,
		draftCategoryId: category.id,
		new: "1",
	}).toString()}`;

	return (
		<TableRow className="group">
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
						<Link data-view href={linkHref} className="hover:underline">
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
					defaultValue={String(fromCents(category.budgeted) || 0)}
					onBlur={(e) => {
						const next = Number(e.currentTarget.value || 0);
						if (!Number.isNaN(next) && next !== fromCents(category.budgeted)) {
							setBudgetedAmount(category.id, month, next);
						}
					}}
					onKeyDown={(e) => {
						if (e.key === "Enter") e.currentTarget.blur();
					}}
				/>
			</TableCell>
			<TableCell className="text-right">
				<Link href={linkHref} className="hover:underline">
					{formatCurrency(category.activity)}
				</Link>
			</TableCell>
			<TableCell
				className={`text-right ${category.available < 0 ? "text-destructive" : ""}`}
			>
				<Link href={linkHref} className="hover:underline">
					{formatCurrency(category.available)}
				</Link>
			</TableCell>
		</TableRow>
	);
};

export default BudgetCategoryRow;
