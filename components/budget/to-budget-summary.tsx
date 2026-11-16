"use client";

import { useState } from "react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/tailwindcss/utils";
import HoldForNextMonth from "./hold-for-next-month";
import ToBudgetBreakdown from "./to-budget-breakdown";

export default function ToBudgetSummary({ view }: { view: BudgetView }) {
	const [open, setOpen] = useState(false);
	const over = view.toBudget < 0;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"h-9 gap-2.5",
						over && "border-destructive/40 bg-destructive/10",
						view.toBudget > 0 && "border-positive/40 bg-positive/10",
					)}
				>
					<span className="text-muted-foreground">
						{over ? "Overbudgeted" : "To budget"}
					</span>
					<Money
						value={view.toBudget}
						className={cn(
							"text-base font-semibold",
							over ? "text-destructive" : view.toBudget > 0 && "text-positive",
						)}
					/>
				</Button>
			</PopoverTrigger>
			<PopoverContent align="end" className="w-80 space-y-3">
				<ToBudgetBreakdown view={view} />
				{(view.toBudget > 0 || view.buffered > 0) && (
					<>
						<Separator />
						<HoldForNextMonth view={view} onDone={() => setOpen(false)} />
					</>
				)}
			</PopoverContent>
		</Popover>
	);
}
