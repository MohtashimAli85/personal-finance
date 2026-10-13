"use client";

import { Redo2 } from "lucide-react";
import Link from "next/link";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor } from "@/components/ui/popover";
import { formatCurrency } from "@/lib/helper";
import { cn } from "@/lib/tailwindcss/utils";
import { categoryTransactionsHref } from "./category-href";
import TransferBudgetPopover from "./transfer-budget-popover";
import { useCategoryCarryover } from "./use-category-carryover";
import { useTransferPopover } from "./use-transfer-popover";

const toneFor = (balance: number) =>
	balance > 0
		? "text-emerald-500"
		: balance < 0
			? "bg-destructive/15 text-destructive"
			: "text-muted-foreground";

export default function BalanceCell({
	category,
	month,
}: {
	category: BudgetCategoryRow;
	month: string;
}) {
	const { isPending, setCarryover } = useCategoryCarryover(category.id, month);
	const transfer = useTransferPopover();

	return (
		<Popover open={transfer.open} onOpenChange={transfer.setOpen}>
			<DropdownMenu>
				<PopoverAnchor asChild>
					<DropdownMenuTrigger asChild disabled={isPending}>
						<button
							type="button"
							className="relative -mr-1.5 inline-flex items-center"
						>
							{category.carryover && (
								<Redo2
									className="absolute -left-5 size-3.5 text-muted-foreground"
									aria-label="Rolls over overspending"
								/>
							)}
							<span
								data-money
								className={cn(
									"rounded-sm px-1.5 hover:underline",
									toneFor(category.balance),
								)}
							>
								{formatCurrency(category.balance)}
							</span>
						</button>
					</DropdownMenuTrigger>
				</PopoverAnchor>
				<DropdownMenuContent
					align="end"
					className="w-fit whitespace-nowrap"
					onCloseAutoFocus={transfer.onMenuCloseAutoFocus}
				>
					<DropdownMenuCheckboxItem
						checked={category.carryover}
						onCheckedChange={(checked) => setCarryover(checked === true)}
					>
						Rollover overspending
					</DropdownMenuCheckboxItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem onSelect={transfer.request}>
						Transfer to another category
					</DropdownMenuItem>
					<DropdownMenuItem asChild>
						<Link href={categoryTransactionsHref(category.id, month)}>
							View transactions
						</Link>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			{transfer.open && (
				<TransferBudgetPopover
					category={category}
					month={month}
					onDone={() => transfer.setOpen(false)}
				/>
			)}
		</Popover>
	);
}
