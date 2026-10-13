"use client";

import Link from "next/link";
import { TableCell, TableRow } from "@/components/ui/table";
import { useBudgetContext } from "@/context/budget-context";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import { amountTone, CATEGORY_INDENT, NUMBER_CELL } from "./budget-cells";
import { categoryTransactionsHref } from "./category-href";

export default function IncomeRows() {
	const { month, incomeGroup, showHidden } = useBudgetContext();
	if (!incomeGroup) return null;

	const categories = showHidden
		? incomeGroup.categories
		: incomeGroup.categories.filter((c) => !c.hidden);
	const received = incomeGroup.categories.reduce(
		(sum, c) => sum + c.received,
		0,
	);

	return (
		<>
			<TableRow className="bg-muted/40">
				<TableCell className="h-8 pl-[29px] font-semibold">
					{incomeGroup.name}
				</TableCell>
				<TableCell />
				<TableCell className={cn(NUMBER_CELL, "text-muted-foreground")}>
					Received
				</TableCell>
				<TableCell className={cn(NUMBER_CELL, "font-semibold")} data-money>
					{formatCurrency(received)}
				</TableCell>
			</TableRow>
			{categories.map((category) => (
				<TableRow
					key={category.id}
					className={cn(category.hidden && "opacity-50")}
				>
					<TableCell className={cn("h-8", CATEGORY_INDENT)}>
						<Link
							href={categoryTransactionsHref(category.id, month)}
							className="hover:underline"
						>
							{category.name}
						</Link>
					</TableCell>
					<TableCell />
					<TableCell />
					<TableCell
						className={cn(NUMBER_CELL, amountTone(category.received))}
						data-money
					>
						{formatCurrency(category.received)}
					</TableCell>
				</TableRow>
			))}
		</>
	);
}
