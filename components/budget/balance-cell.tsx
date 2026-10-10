"use client";

import { Redo2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import { categoryTransactionsHref } from "./category-href";
import { useCategoryCarryover } from "./use-category-carryover";

const toneFor = (balance: number) =>
	balance > 0
		? "bg-emerald-500/15 text-emerald-500"
		: balance < 0
			? "bg-destructive/15 text-destructive"
			: "bg-transparent text-muted-foreground";

export default function BalanceCell({
	category,
	month,
}: {
	category: BudgetCategoryRow;
	month: string;
}) {
	const { isPending, setCarryover } = useCategoryCarryover(category.id, month);

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild disabled={isPending}>
				<button type="button" className="inline-flex items-center gap-1">
					<Badge
						data-money
						className={cn("cursor-pointer text-sm", toneFor(category.balance))}
					>
						{formatCurrency(category.balance)}
					</Badge>
					{category.carryover && (
						<Redo2
							className="size-3.5 text-muted-foreground"
							aria-label="Rolls over overspending"
						/>
					)}
				</button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuCheckboxItem
					checked={category.carryover}
					onCheckedChange={(checked) => setCarryover(checked === true)}
				>
					Rollover overspending
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href={categoryTransactionsHref(category.id, month)}>
						View transactions
					</Link>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
