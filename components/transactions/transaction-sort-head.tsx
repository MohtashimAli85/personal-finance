"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/tailwindcss/utils";
import { HEAD_CELL } from "./transaction-cells";
import { type SortColumn, useTransactionSort } from "./use-transaction-sort";

const ARIA_SORT = { asc: "ascending", desc: "descending" } as const;

export default function TransactionSortHead({
	column,
	label,
	alignEnd,
	className,
}: {
	column: SortColumn;
	label: string;
	alignEnd?: boolean;
	className?: string;
}) {
	const { direction, toggle } = useTransactionSort(column);
	const Icon =
		direction === "asc"
			? ArrowUp
			: direction === "desc"
				? ArrowDown
				: ChevronsUpDown;

	return (
		<TableHead
			className={cn(HEAD_CELL, className)}
			aria-sort={direction ? ARIA_SORT[direction] : "none"}
		>
			<Button
				variant="table"
				className={cn(
					"w-full justify-start text-xs hover:text-foreground",
					alignEnd && "flex-row-reverse",
					direction && "text-foreground",
				)}
				onClick={(event) => {
					event.currentTarget
						.closest('[data-slot="scroll-area-viewport"]')
						?.scrollTo({ top: 0 });
					toggle();
				}}
			>
				{label}
				<Icon
					className={cn(
						"size-3",
						!direction &&
							"opacity-0 group-hover/button:opacity-100 group-focus-visible/button:opacity-100",
					)}
				/>
			</Button>
		</TableHead>
	);
}
